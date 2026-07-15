import "server-only"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/server/db"
import { orderService, authorizationService } from "@/server/services"
import { requireAuth, parseJsonBody, requireUuidParams, logAudit } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok } from "@/server/lib/http"
import { getOrderWithDetailsOrThrow, toOrderResponse } from "../_order-response"

interface RouteContext {
  params: Promise<{ storeId: string; orderId: string }>
}

/** API_SPEC.md `PATCH /api/v1/stores/:storeId/orders/:orderId` — request body. */
const updateOrderSchema = z.object({
  notes: z.string().max(500).nullable().optional(),
  scheduledFor: z.string().nullable().optional(),
  tableNumber: z.string().nullable().optional(),
  deliveryAddressId: z.string().optional(),
})

async function handleGetOrder(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, orderId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "orders:view")

  const order = await getOrderWithDetailsOrThrow(storeId, orderId)
  return ok(await toOrderResponse(order))
}

async function handleUpdateOrder(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, orderId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "orders:edit")

  // Confirms the order belongs to this store before any mutation (Store Isolation).
  await getOrderWithDetailsOrThrow(storeId, orderId)

  const input = await parseJsonBody(request, updateOrderSchema)
  await orderService.update(prisma, storeId, orderId, input)
  void logAudit(prisma, { storeId, userId: actor.userId, action: "order.updated", entityType: "Order", entityId: orderId, entityRef: orderId })

  const updated = await getOrderWithDetailsOrThrow(storeId, orderId)
  return ok(await toOrderResponse(updated))
}

export const GET = compose(withRequestContext, withErrorHandling)(handleGetOrder)
export const PATCH = compose(withRequestContext, withErrorHandling)(handleUpdateOrder)
