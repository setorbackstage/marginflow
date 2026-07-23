import "server-only"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/server/db"
import { ingredientService, authorizationService } from "@/server/services"
import { requireAuth, parseJsonBody, requireUuidParams } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, created } from "@/server/lib/http"

interface RouteContext {
  params: Promise<{ storeId: string }>
}

/**
 * POST /api/v1/stores/:storeId/inventory/adjustments
 * Manual stock entry / adjustment / loss. Fixes BUG-05 — there was no way to
 * record incoming merchandise or correct a wrong balance via the API.
 * The `inventory:adjust` permission already existed but had no endpoint.
 */
const createAdjustmentSchema = z.object({
  ingredientId: z.string().uuid(),
  /** Positive to add stock (ENTRY / ADJUSTMENT), negative to remove (LOSS). */
  quantityDelta: z.number().refine((v) => v !== 0, "quantityDelta must not be zero"),
  /** ENTRY = incoming merchandise, ADJUSTMENT = correction, LOSS = write-off. */
  type: z.enum(["ENTRY", "ADJUSTMENT", "LOSS"]).default("ADJUSTMENT"),
  reason: z.string().min(1).max(500),
})

async function handleCreateAdjustment(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "inventory:adjust")

  const input = await parseJsonBody(request, createAdjustmentSchema)
  const adjustment = await ingredientService.adjustStock(prisma, storeId, actor.userId, input)
  return created(adjustment)
}

export const POST = compose(withRequestContext, withErrorHandling)(handleCreateAdjustment)
