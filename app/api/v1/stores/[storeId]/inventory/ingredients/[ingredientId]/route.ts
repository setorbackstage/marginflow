import "server-only"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/server/db"
import { ingredientService, authorizationService } from "@/server/services"
import { requireAuth, parseJsonBody, requireUuidParams } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok, noContent } from "@/server/lib/http"
import { toIngredientResponse } from "../../_ingredient-response"

interface RouteContext {
  params: Promise<{ storeId: string; ingredientId: string }>
}

async function handleGetIngredient(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, ingredientId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "inventory:view")

  const ingredient = await ingredientService.getById(prisma, storeId, ingredientId)
  const usages = await ingredientService.listUsages(prisma, ingredientId)
  const productIds = usages.map((recipe) => recipe.productId)
  const products = productIds.length
    ? await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true } })
    : []
  const productNameById = new Map(products.map((product) => [product.id, product.name]))

  return ok({
    ...toIngredientResponse(ingredient),
    usedInRecipes: usages.map((recipe) => ({
      recipeId: recipe.id,
      productId: recipe.productId,
      productName: productNameById.get(recipe.productId) ?? "",
    })),
  })
}

/** API_SPEC.md: `unit` is immutable and `currentStock` is not writable. */
const updateIngredientSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  costPerUnit: z.number().min(0).optional(),
  minStock: z.number().min(0).nullable().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  category: z.string().max(60).nullable().optional(),
})

async function handleUpdateIngredient(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, ingredientId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "inventory:manage")

  const input = await parseJsonBody(request, updateIngredientSchema)
  const ingredient = await ingredientService.update(prisma, storeId, ingredientId, input)
  return ok(toIngredientResponse(ingredient))
}

async function handleDeleteIngredient(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, ingredientId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "inventory:manage")

  await ingredientService.softDelete(prisma, storeId, ingredientId)
  return noContent()
}

export const GET = compose(withRequestContext, withErrorHandling)(handleGetIngredient)
export const PATCH = compose(withRequestContext, withErrorHandling)(handleUpdateIngredient)
export const DELETE = compose(withRequestContext, withErrorHandling)(handleDeleteIngredient)
