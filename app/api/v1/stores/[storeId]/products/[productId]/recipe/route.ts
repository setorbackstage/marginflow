import "server-only"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/server/db"
import { recipeService, authorizationService } from "@/server/services"
import { requireAuth, parseJsonBody, requireUuidParams } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok, created, noContent } from "@/server/lib/http"

interface RouteContext {
  params: Promise<{ storeId: string; productId: string }>
}

async function handleGetRecipe(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, productId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "inventory:view")

  return ok(await recipeService.getByProduct(prisma, storeId, productId))
}

/** API_SPEC.md `PUT /api/v1/stores/:storeId/products/:productId/recipe` — full replace. */
const upsertRecipeSchema = z.object({
  yieldQuantity: z.number().gt(0).optional(),
  notes: z.string().max(1000).nullable().optional(),
  items: z
    .array(
      z.object({
        ingredientId: z.string().uuid(),
        quantity: z.number().gt(0),
        wastePct: z.number().min(0).max(100).optional(),
      }),
    )
    .min(1),
})

async function handleUpsertRecipe(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, productId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "inventory:manage")

  const input = await parseJsonBody(request, upsertRecipeSchema)
  const result = await prisma.$transaction((tx) => recipeService.upsert(tx, storeId, productId, input))
  return result.created ? created(result.recipe) : ok(result.recipe)
}

async function handleDeleteRecipe(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, productId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "inventory:manage")

  await recipeService.delete(prisma, storeId, productId)
  return noContent()
}

export const GET = compose(withRequestContext, withErrorHandling)(handleGetRecipe)
export const PUT = compose(withRequestContext, withErrorHandling)(handleUpsertRecipe)
export const DELETE = compose(withRequestContext, withErrorHandling)(handleDeleteRecipe)
