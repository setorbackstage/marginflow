import "server-only"
import type { NextRequest } from "next/server"
import { z } from "zod"
import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/server/db"
import { categoryService, authorizationService } from "@/server/services"
import { requireAuth, parseJsonBody, parseQuery, requireUuidParams } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok, created } from "@/server/lib/http"
import { toCategoryResponse } from "./_category-response"

interface RouteContext {
  params: Promise<{ storeId: string }>
}

/** API_SPEC.md `GET /api/v1/stores/:storeId/categories` — query parameters. */
const listCategoriesQuerySchema = z.object({
  isActive: z.coerce.boolean().optional(),
  search: z.string().optional(),
})

/** API_SPEC.md `POST /api/v1/stores/:storeId/categories` — request body. */
const createCategorySchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(500).nullable().optional(),
  imageUrl: z.url().nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
})

async function handleListCategories(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "products:view")

  const query = parseQuery(request.nextUrl.searchParams, listCategoriesQuerySchema)
  const where: Prisma.CategoryWhereInput = {
    ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    ...(query.search ? { name: { contains: query.search, mode: "insensitive" as const } } : {}),
  }

  const categories = await categoryService.listByStore(prisma, storeId, where)
  return ok(await Promise.all(categories.map(toCategoryResponse)))
}

async function handleCreateCategory(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "products:create")

  const input = await parseJsonBody(request, createCategorySchema)
  const category = await categoryService.create(prisma, storeId, input)
  return created(await toCategoryResponse(category))
}

export const GET = compose(withRequestContext, withErrorHandling)(handleListCategories)
export const POST = compose(withRequestContext, withErrorHandling)(handleCreateCategory)
