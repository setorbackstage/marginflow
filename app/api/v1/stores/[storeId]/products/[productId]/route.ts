import "server-only"
import type { NextRequest } from "next/server"
import { z } from "zod"
import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/server/db"
import { productService, authorizationService } from "@/server/services"
import type { UpdateProductInput } from "@/server/services"
import { requireAuth, parseJsonBody, requireUuidParams } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok, noContent } from "@/server/lib/http"
import { toProductDetailResponse } from "../_product-response"

interface RouteContext {
  params: Promise<{ storeId: string; productId: string }>
}

/** API_SPEC.md `PATCH /api/v1/stores/:storeId/products/:productId` — request body. */
const updateProductSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(1000).nullable().optional(),
  price: z.number().int().min(0).optional(),
  imageUrl: z.url().nullable().optional(),
  sku: z.string().max(50).nullable().optional(),
  categoryId: z.string().min(1).optional(),
  type: z.enum(["SIMPLE", "COMBO", "SERVICE_CHARGE"]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "OUT_OF_STOCK"]).optional(),
  sortOrder: z.number().int().min(0).optional(),
  availabilitySchedule: z.record(z.string(), z.unknown()).nullable().optional(),
})

async function handleGetProduct(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, productId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "products:view")

  const product = await productService.getByIdWithModifierGroups(prisma, storeId, productId)
  return ok(toProductDetailResponse(product))
}

async function handleUpdateProduct(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, productId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "products:edit")

  const input = await parseJsonBody(request, updateProductSchema)
  const updateInput: UpdateProductInput = {
    ...input,
    availabilitySchedule: input.availabilitySchedule as Prisma.InputJsonValue | null | undefined,
  }
  await productService.update(prisma, storeId, productId, updateInput)

  const product = await productService.getByIdWithModifierGroups(prisma, storeId, productId)
  return ok(toProductDetailResponse(product))
}

async function handleDeleteProduct(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, productId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "products:delete")

  await productService.softDelete(prisma, storeId, productId)
  return noContent()
}

export const GET = compose(withRequestContext, withErrorHandling)(handleGetProduct)
export const PATCH = compose(withRequestContext, withErrorHandling)(handleUpdateProduct)
export const DELETE = compose(withRequestContext, withErrorHandling)(handleDeleteProduct)
