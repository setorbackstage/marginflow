import "server-only"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/server/db"
import { orderService, authorizationService } from "@/server/services"
import { requireAuth, parseJsonBody } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, created } from "@/server/lib/http"
import { getOrderWithDetailsOrThrow, toOrderItemResponse } from "../../_order-response"

interface RouteContext {
  params: Promise<{ storeId: string; orderId: string }>
}

/** API_SPEC.md `POST /api/v1/stores/:storeId/orders/:orderId/items` — request body. */
const createOrderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1),
  selectedModifiers: z
    .array(
      z.object({
        modifierId: z.string().min(1),
        modifierGroupId: z.string().min(1),
      }),
    )
    .optional(),
  notes: z.string().max(200).nullable().optional(),
})

async function handleAddItem(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, orderId } = await params
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "orders:edit")

  // Confirms the order belongs to this store before any mutation (Store Isolation).
  await getOrderWithDetailsOrThrow(storeId, orderId)

  const input = await parseJsonBody(request, createOrderItemSchema)
  const item = await orderService.addItem(prisma, storeId, orderId, input)
  const order = await orderService.getById(prisma, orderId)

  return created({
    item: toOrderItemResponse(item),
    order: {
      itemsTotal: order.itemsTotal,
      discountTotal: order.discountTotal,
      deliveryFee: order.deliveryFee,
      grandTotal: order.grandTotal,
    },
  })
}

export const POST = compose(withRequestContext, withErrorHandling)(handleAddItem)
