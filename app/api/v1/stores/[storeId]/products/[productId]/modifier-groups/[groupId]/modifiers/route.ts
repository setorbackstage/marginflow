import "server-only"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/server/db"
import { modifierService, modifierGroupService, authorizationService } from "@/server/services"
import { requireAuth, parseJsonBody } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok, created } from "@/server/lib/http"

interface RouteContext {
  params: Promise<{ storeId: string; productId: string; groupId: string }>
}

/** API_SPEC.md `POST .../modifiers` — request body. */
const createModifierSchema = z.object({
  name: z.string().min(1),
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

async function handleListModifiers(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, productId, groupId } = await params
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "products:view")

  // Store + parent-Product Isolation (API_SPEC.md): confirms `groupId` belongs to this product/store before listing.
  await modifierGroupService.getById(prisma, storeId, productId, groupId)
  const modifiers = await modifierService.listByGroup(prisma, groupId)
  return ok(modifiers.map(toModifierResponse))
}

async function handleCreateModifier(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, productId, groupId } = await params
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "products:create")

  // Store + parent-Product Isolation (API_SPEC.md): confirms `groupId` belongs to this product/store before creating.
  await modifierGroupService.getById(prisma, storeId, productId, groupId)
  const input = await parseJsonBody(request, createModifierSchema)
  const modifier = await modifierService.create(prisma, storeId, groupId, input)
  return created(toModifierResponse(modifier))
}

export const GET = compose(withRequestContext, withErrorHandling)(handleListModifiers)
export const POST = compose(withRequestContext, withErrorHandling)(handleCreateModifier)
