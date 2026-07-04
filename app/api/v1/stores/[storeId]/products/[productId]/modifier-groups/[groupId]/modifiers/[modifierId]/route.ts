import "server-only"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/server/db"
import { modifierService, authorizationService } from "@/server/services"
import { requireAuth, parseJsonBody } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok, noContent } from "@/server/lib/http"

interface RouteContext {
  params: Promise<{ storeId: string; productId: string; groupId: string; modifierId: string }>
}

/** API_SPEC.md `PATCH .../modifiers/:modifierId` — request body. */
const updateModifierSchema = z.object({
  name: z.string().min(1).optional(),
  priceAdjustment: z.number().int().optional(),
  sku: z.string().nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
})

function toModifierResponse(modifier: Awaited<ReturnType<typeof modifierService.getById>>) {
  return {
    id: modifier.id,
    modifierGroupId: modifier.modifierGroupId,
    name: modifier.name,
    priceAdjustment: modifier.priceAdjustment,
    sku: modifier.sku,
    sortOrder: modifier.sortOrder,
    isActive: modifier.isActive,
  }
}

async function handleUpdateModifier(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, groupId, modifierId } = await params
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "products:edit")

  const input = await parseJsonBody(request, updateModifierSchema)
  const modifier = await modifierService.update(prisma, storeId, groupId, modifierId, input)
  return ok(toModifierResponse(modifier))
}

async function handleDeleteModifier(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, groupId, modifierId } = await params
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "products:delete")

  await modifierService.softDelete(prisma, storeId, groupId, modifierId)
  return noContent()
}

export const PATCH = compose(withRequestContext, withErrorHandling)(handleUpdateModifier)
export const DELETE = compose(withRequestContext, withErrorHandling)(handleDeleteModifier)
