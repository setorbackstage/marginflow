import "server-only"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/server/db"
import { orderService, authorizationService } from "@/server/services"
import { requireAuth, parseJsonBody } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok, noContent } from "@/server/lib/http"
import { getOrderWithDetailsOrThrow, toOrderItemResponse } from "../../../_order-response"

interface RouteContext {
  params: Promise<{ storeId: string; orderId: string; itemId: string }>
}

/** API_SPEC.md `PATCH /api/v1/stores/:storeId/orders/:orderId/items/:itemId` — request body. */
const updateOrderItemSchema = z.object({
  quantity: z.number().int().min(1).optional(),
  notes: z.string().nullable().optional(),
})

async function handleUpdateItem(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, orderId, itemId } = await params
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "orders:edit")

  // Confirms the order belongs to this store before any mutation (Store Isolation).
  await getOrderWithDetailsOrThrow(storeId, orderId)

  const input = await parseJsonBody(request, updateOrderItemSchema)
  const item = await orderService.updateItem(prisma, orderId, itemId, input)
  const order = await orderService.getById(prisma, orderId)

  return ok({
    item: toOrderItemResponse(item),
    order: {
      itemsTotal: order.itemsTotal,
      discountTotal: order.discountTotal,
      deliveryFee: order.deliveryFee,
      grandTotal: order.grandTotal,
    },
  })
}

async function handleRemoveItem(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, orderId, itemId } = await params
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "orders:edit")

  // Confirms the order belongs to this store before any mutation (Store Isolation).
  await getOrderWithDetailsOrThrow(storeId, orderId)

  await orderService.removeItem(prisma, orderId, itemId)
  return noContent()
}

export const PATCH = compose(withRequestContext, withErrorHandling)(handleUpdateItem)
export const DELETE = compose(withRequestContext, withErrorHandling)(handleRemoveItem)
