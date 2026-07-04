import "server-only"
import type { NextRequest } from "next/server"
import { z } from "zod"
import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/server/db"
import { deliveryService, authorizationService } from "@/server/services"
import { requireAuth, parseQuery, requireUuidParams } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, paginated, buildPaginationMeta } from "@/server/lib/http"
import { toDeliveryResponse } from "./_delivery-response"

interface RouteContext {
  params: Promise<{ storeId: string }>
}

/** API_SPEC.md `GET /api/v1/stores/:storeId/deliveries` — query parameters. */
const listDeliveriesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().default("AWAITING_PICKUP,DISPATCHED,IN_TRANSIT"),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
})

function buildDateRange(dateFrom?: string, dateTo?: string): Prisma.DeliveryWhereInput["createdAt"] | undefined {
  if (!dateFrom && !dateTo) return undefined
  const range: { gte?: Date; lte?: Date } = {}
  if (dateFrom) range.gte = new Date(`${dateFrom}T00:00:00.000Z`)
  if (dateTo) range.lte = new Date(`${dateTo}T23:59:59.999Z`)
  return range
}

async function handleListDeliveries(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "delivery:view")

  const query = parseQuery(request.nextUrl.searchParams, listDeliveriesQuerySchema)
  const where: Prisma.DeliveryWhereInput = {
    status: { in: query.status.split(",") },
    createdAt: buildDateRange(query.dateFrom, query.dateTo),
  }

  const [deliveries, total] = await Promise.all([
    deliveryService.listByStore(prisma, storeId, {
      where,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    deliveryService.count(prisma, { storeId, ...where }),
  ])

  return paginated(
    deliveries.map((delivery) => toDeliveryResponse(delivery, delivery.order.number)),
    buildPaginationMeta(query.page, query.limit, total),
  )
}

export const GET = compose(withRequestContext, withErrorHandling)(handleListDeliveries)
