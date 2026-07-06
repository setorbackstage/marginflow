import "server-only"
import type { NextRequest } from "next/server"
import { z } from "zod"
import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/server/db"
import { stockMovementService, authorizationService } from "@/server/services"
import type { StockMovementWithRelations } from "@/server/repositories"
import { requireAuth, parseQuery, parseJsonBody, requireUuidParams } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, paginated, buildPaginationMeta, created } from "@/server/lib/http"
import { BadRequestError } from "@/server/lib/errors"

interface RouteContext {
  params: Promise<{ storeId: string }>
}

function toMovementResponse(movement: StockMovementWithRelations) {
  return {
    id: movement.id,
    storeId: movement.storeId,
    ingredientId: movement.ingredientId,
    ingredientName: movement.ingredient.name,
    ingredientUnit: movement.ingredient.unit,
    type: movement.type,
    quantityDelta: Number(movement.quantityDelta),
    unitCost: Number(movement.unitCost),
    orderId: movement.orderId,
    orderNumber: movement.order?.number ?? null,
    reason: movement.reason,
    createdByUserId: movement.createdByUserId,
    createdByUserName: movement.createdByUser?.name ?? null,
    createdAt: movement.createdAt,
  }
}

/** Same UTC-day simplification as the orders route (see its buildDateRange note). */
function buildDateRange(dateFrom?: string, dateTo?: string): Prisma.StockMovementWhereInput["createdAt"] | undefined {
  if (!dateFrom && !dateTo) return undefined
  const range: { gte?: Date; lte?: Date } = {}
  if (dateFrom) range.gte = new Date(`${dateFrom}T00:00:00.000Z`)
  if (dateTo) range.lte = new Date(`${dateTo}T23:59:59.999Z`)
  return range
}

const MOVEMENT_TYPES = ["ENTRY", "EXIT", "ADJUSTMENT", "LOSS", "SALE_CONSUMPTION", "SALE_REVERSAL"] as const

/** API_SPEC.md `GET /api/v1/stores/:storeId/inventory/movements` — query parameters. */
const listMovementsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  ingredientId: z.string().uuid().optional(),
  type: z.enum(MOVEMENT_TYPES).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
})

async function handleListMovements(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "inventory:view")

  const query = parseQuery(request.nextUrl.searchParams, listMovementsQuerySchema)

  const where: Prisma.StockMovementWhereInput = {
    ...(query.ingredientId ? { ingredientId: query.ingredientId } : {}),
    ...(query.type ? { type: query.type } : {}),
    createdAt: buildDateRange(query.dateFrom, query.dateTo),
  }

  const [movements, total] = await Promise.all([
    stockMovementService.listByStore(prisma, storeId, {
      where,
      skip: (query.page - 1) * query.perPage,
      take: query.perPage,
    }),
    stockMovementService.count(prisma, storeId, where),
  ])

  return paginated(movements.map(toMovementResponse), buildPaginationMeta(query.page, query.perPage, total))
}

/**
 * API_SPEC.md `POST /api/v1/stores/:storeId/inventory/movements` — manual
 * movements only. SALE_* types are reserved for the event consumer and are
 * rejected before schema validation to return the documented
 * INVALID_MOVEMENT_TYPE instead of a generic VALIDATION_ERROR.
 */
const createMovementSchema = z
  .object({
    ingredientId: z.string().uuid(),
    type: z.enum(["ENTRY", "EXIT", "ADJUSTMENT", "LOSS"]),
    quantity: z.number().gt(0),
    direction: z.enum(["INCREASE", "DECREASE"]).optional(),
    reason: z.string().min(3).max(500).nullable().optional(),
    costPerUnit: z.number().min(0).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.type === "ADJUSTMENT" && !value.direction) {
      ctx.addIssue({ code: "custom", path: ["direction"], message: "direction is required for ADJUSTMENT" })
    }
    if ((value.type === "ADJUSTMENT" || value.type === "LOSS") && !value.reason) {
      ctx.addIssue({ code: "custom", path: ["reason"], message: "reason is required for ADJUSTMENT and LOSS" })
    }
  })

async function handleCreateMovement(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "inventory:adjust")

  const raw = (await request.clone().json().catch(() => null)) as { type?: string } | null
  if (raw && (raw.type === "SALE_CONSUMPTION" || raw.type === "SALE_REVERSAL")) {
    throw new BadRequestError("INVALID_MOVEMENT_TYPE", "SALE_CONSUMPTION and SALE_REVERSAL are reserved for the event consumer.")
  }

  const input = await parseJsonBody(request, createMovementSchema)
  const result = await prisma.$transaction((tx) => stockMovementService.createManual(tx, storeId, input, actor.userId))

  const [movement] = await stockMovementService.listByStore(prisma, storeId, {
    where: { id: result.movement.id },
    take: 1,
  })
  return created({ ...toMovementResponse(movement), currentStock: result.currentStock })
}

export const GET = compose(withRequestContext, withErrorHandling)(handleListMovements)
export const POST = compose(withRequestContext, withErrorHandling)(handleCreateMovement)
