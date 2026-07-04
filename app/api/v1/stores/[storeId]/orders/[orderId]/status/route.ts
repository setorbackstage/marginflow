import "server-only"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/server/db"
import { orderService, deliveryService, authorizationService } from "@/server/services"
import { requireAuth, parseJsonBody, BadRequestError, ConflictError, requireUuidParams } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok } from "@/server/lib/http"
import { getOrderWithDetailsOrThrow, toOrderResponse } from "../../_order-response"

interface RouteContext {
  params: Promise<{ storeId: string; orderId: string }>
}

/** API_SPEC.md `POST /api/v1/stores/:storeId/orders/:orderId/status` — request body. */
const updateStatusSchema = z.object({
  status: z.enum(["DRAFT", "PENDING", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"]),
  reason: z.string().optional(),
  notes: z.string().optional(),
})

/** API_SPEC.md "Allowed Transitions" table — the only targets this endpoint itself accepts. */
const STATUS_PERMISSION: Record<string, string> = {
  PENDING: "orders:create",
  CONFIRMED: "orders:edit",
  DELIVERED: "orders:edit",
  CANCELLED: "orders:cancel",
}

async function handleUpdateStatus(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, orderId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  const input = await parseJsonBody(request, updateStatusSchema)

  // DRAFT is never a valid target here; PREPARING/READY/OUT_FOR_DELIVERY are
  // system-derived (Kitchen/Delivery own them) — API_SPEC.md: calling this
  // endpoint with one of those returns 400 INVALID_TRANSITION.
  const permission = STATUS_PERMISSION[input.status]
  if (!permission) {
    throw new BadRequestError("INVALID_TRANSITION", "The requested transition is not allowed.")
  }
  await authorizationService.requirePermission(prisma, actor.userId, storeId, permission)

  // Confirms the order belongs to this store before any mutation (Store Isolation).
  await getOrderWithDetailsOrThrow(storeId, orderId)

  let isManagerApproved = false
  if (input.status === "CANCELLED") {
    const delivery = await deliveryService.findByOrderId(prisma, orderId)
    const dispatchedOrLater = delivery !== null && delivery.status !== "AWAITING_PICKUP"
    if (dispatchedOrLater) {
      isManagerApproved = await authorizationService.isManagerOrOwner(prisma, actor.userId, storeId)
      if (!isManagerApproved) {
        throw new ConflictError(
          "DISPATCHED_DELIVERY_CANCEL_REQUIRES_MANAGER",
          "Cancelling a dispatched delivery requires manager role.",
        )
      }
    }
  }

  // API_SPEC.md's Event Contracts: side effects of this transition (e.g. Kitchen
  // Ticket creation on order.confirmed) must land in the same database
  // transaction as the status change itself — the synchronous event bus runs
  // listeners with this same `tx` client, so a listener failure rolls back
  // the whole transition, not just the order row.
  await prisma.$transaction((tx) =>
    orderService.updateStatus(tx, storeId, orderId, input.status, {
      reason: input.reason,
      notes: input.notes,
      triggeredByUserId: actor.userId,
      isManagerApproved,
    }),
  )

  const updated = await getOrderWithDetailsOrThrow(storeId, orderId)
  return ok(await toOrderResponse(updated))
}

export const POST = compose(withRequestContext, withErrorHandling)(handleUpdateStatus)
