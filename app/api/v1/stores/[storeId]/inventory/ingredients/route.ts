import "server-only"
import type { NextRequest } from "next/server"
import { z } from "zod"
import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/server/db"
import { ingredientService, authorizationService } from "@/server/services"
import { requireAuth, parseQuery, parseJsonBody, requireUuidParams } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, paginated, buildPaginationMeta, created } from "@/server/lib/http"
import { toIngredientResponse } from "../_ingredient-response"

interface RouteContext {
  params: Promise<{ storeId: string }>
}

/** API_SPEC.md `GET /api/v1/stores/:storeId/inventory/ingredients` — query parameters. */
const listIngredientsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  category: z.string().optional(),
  lowStock: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
})

async function handleListIngredients(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "inventory:view")

  const query = parseQuery(request.nextUrl.searchParams, listIngredientsQuerySchema)

  const where: Prisma.IngredientWhereInput = {
    ...(query.search ? { name: { contains: query.search, mode: "insensitive" as const } } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.category ? { category: query.category } : {}),
    ...(query.lowStock
      ? { minStock: { not: null }, currentStock: { lte: prisma.ingredient.fields.minStock } }
      : {}),
  }

  const [ingredients, total] = await Promise.all([
    ingredientService.listByStore(prisma, storeId, {
      where,
      skip: (query.page - 1) * query.perPage,
      take: query.perPage,
    }),
    ingredientService.count(prisma, storeId, where),
  ])

  return paginated(ingredients.map(toIngredientResponse), buildPaginationMeta(query.page, query.perPage, total))
}

/** API_SPEC.md `POST /api/v1/stores/:storeId/inventory/ingredients` — request body. */
const createIngredientSchema = z.object({
  name: z.string().min(2).max(120),
  unit: z.enum(["G", "ML", "UN"]),
  costPerUnit: z.number().min(0).optional(),
  /** Opening balance. Defaults to 0 when omitted (matches legacy behavior). */
  currentStock: z.number().optional(),
  minStock: z.number().min(0).nullable().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  category: z.string().max(60).nullable().optional(),
})

async function handleCreateIngredient(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "inventory:manage")

  const input = await parseJsonBody(request, createIngredientSchema)
  const ingredient = await ingredientService.create(prisma, storeId, input)
  return created(toIngredientResponse(ingredient))
}

export const GET = compose(withRequestContext, withErrorHandling)(handleListIngredients)
export const POST = compose(withRequestContext, withErrorHandling)(handleCreateIngredient)
