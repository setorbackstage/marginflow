import "server-only"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/server/db"
import { modifierGroupService, productService, authorizationService } from "@/server/services"
import { requireAuth, parseJsonBody } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok, created } from "@/server/lib/http"

interface RouteContext {
  params: Promise<{ storeId: string; productId: string }>
}

/** API_SPEC.md `POST .../modifier-groups` — request body. */
const createModifierGroupSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(300).nullable().optional(),
  isRequired: z.boolean(),
  minSelections: z.number().int().min(0),
  maxSelections: z.number().int().min(1),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
})

function toModifierGroupWithModifiersResponse(group: Awaited<ReturnType<typeof modifierGroupService.listByProduct>>[number]) {
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    isRequired: group.isRequired,
    minSelections: group.minSelections,
    maxSelections: group.maxSelections,
    sortOrder: group.sortOrder,
    isActive: group.isActive,
    modifiers: group.modifiers.map((modifier) => ({
      id: modifier.id,
      name: modifier.name,
      priceAdjustment: modifier.priceAdjustment,
      sku: modifier.sku,
      sortOrder: modifier.sortOrder,
      isActive: modifier.isActive,
    })),
  }
}

async function handleListModifierGroups(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, productId } = await params
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "products:view")

  // Store Isolation (API_SPEC.md): confirms `productId` belongs to this store before listing.
  await productService.getById(prisma, storeId, productId)
  const groups = await modifierGroupService.listByProduct(prisma, productId)
  return ok(groups.map(toModifierGroupWithModifiersResponse))
}

async function handleCreateModifierGroup(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, productId } = await params
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "products:create")

  const input = await parseJsonBody(request, createModifierGroupSchema)
  const group = await modifierGroupService.create(prisma, storeId, productId, input)

  return created({
    id: group.id,
    name: group.name,
    description: group.description,
    isRequired: group.isRequired,
    minSelections: group.minSelections,
    maxSelections: group.maxSelections,
    sortOrder: group.sortOrder,
    isActive: group.isActive,
  })
}

export const GET = compose(withRequestContext, withErrorHandling)(handleListModifierGroups)
export const POST = compose(withRequestContext, withErrorHandling)(handleCreateModifierGroup)
