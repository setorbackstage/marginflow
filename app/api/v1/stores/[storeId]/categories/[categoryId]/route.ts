import "server-only"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/server/db"
import { categoryService, authorizationService } from "@/server/services"
import { requireAuth, parseJsonBody, requireUuidParams } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok, noContent } from "@/server/lib/http"
import { toCategoryResponse } from "../_category-response"

interface RouteContext {
  params: Promise<{ storeId: string; categoryId: string }>
}

/** API_SPEC.md `PATCH /api/v1/stores/:storeId/categories/:categoryId` — request body. */
const updateCategorySchema = z.object({
  name: z.string().min(2).max(80).optional(),
  description: z.string().max(500).nullable().optional(),
  imageUrl: z.url().nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
})

async function handleGetCategory(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, categoryId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "products:view")

  const category = await categoryService.getById(prisma, storeId, categoryId)
  return ok(await toCategoryResponse(category))
}

async function handleUpdateCategory(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, categoryId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "products:edit")

  const input = await parseJsonBody(request, updateCategorySchema)
  const category = await categoryService.update(prisma, storeId, categoryId, input)
  return ok(await toCategoryResponse(category))
}

async function handleDeleteCategory(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, categoryId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "products:delete")

  await categoryService.softDelete(prisma, storeId, categoryId)
  return noContent()
}

export const GET = compose(withRequestContext, withErrorHandling)(handleGetCategory)
export const PATCH = compose(withRequestContext, withErrorHandling)(handleUpdateCategory)
export const DELETE = compose(withRequestContext, withErrorHandling)(handleDeleteCategory)
