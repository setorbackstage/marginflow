import "server-only"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/server/db"
import { modifierGroupService, authorizationService } from "@/server/services"
import { requireAuth, parseJsonBody } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok, noContent } from "@/server/lib/http"

interface RouteContext {
  params: Promise<{ storeId: string; productId: string; groupId: string }>
}

/** API_SPEC.md `PATCH .../modifier-groups/:groupId` — request body. */
const updateModifierGroupSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  description: z.string().max(300).nullable().optional(),
  isRequired: z.boolean().optional(),
  minSelections: z.number().int().min(0).optional(),
  maxSelections: z.number().int().min(1).optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
})

function toModifierGroupResponse(group: Awaited<ReturnType<typeof modifierGroupService.getById>>) {
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    isRequired: group.isRequired,
    minSelections: group.minSelections,
    maxSelections: group.maxSelections,
    sortOrder: group.sortOrder,
    isActive: group.isActive,
  }
}

async function handleUpdateModifierGroup(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, productId, groupId } = await params
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "products:edit")

  const input = await parseJsonBody(request, updateModifierGroupSchema)
  const group = await modifierGroupService.update(prisma, storeId, productId, groupId, input)
  return ok(toModifierGroupResponse(group))
}

async function handleDeleteModifierGroup(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, productId, groupId } = await params
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "products:delete")

  await modifierGroupService.softDelete(prisma, storeId, productId, groupId)
  return noContent()
}

export const PATCH = compose(withRequestContext, withErrorHandling)(handleUpdateModifierGroup)
export const DELETE = compose(withRequestContext, withErrorHandling)(handleDeleteModifierGroup)
