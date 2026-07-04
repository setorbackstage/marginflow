import "server-only"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/server/db"
import { deliveryService, orderService, authorizationService } from "@/server/services"
import { requireAuth, parseJsonBody, requireUuidParams } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok } from "@/server/lib/http"
import { toDeliveryResponse } from "../../_delivery-response"

interface RouteContext {
  params: Promise<{ storeId: string; deliveryId: string }>
}

/** API_SPEC.md `POST /api/v1/stores/:storeId/deliveries/:deliveryId/status` — request body. */
const updateDeliveryStatusSchema = z
  .object({
    status: z.enum(["AWAITING_PICKUP", "DISPATCHED", "IN_TRANSIT", "DELIVERED", "FAILED", "RETURNED"]),
    reason: z.string().optional(),
  })
  // API_SPEC.md marks `reason` as "Required when transitioning to FAILED".
  .refine((data) => data.status !== "FAILED" || (data.reason !== undefined && data.reason.trim().length > 0), {
    path: ["reason"],
    message: "reason is required when transitioning to FAILED.",
  })

async function handleUpdateStatus(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, deliveryId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "delivery:update_status")

  const input = await parseJsonBody(request, updateDeliveryStatusSchema)
  const isManagerOrOwner = await authorizationService.isManagerOrOwner(prisma, actor.userId, storeId)

  // API_SPEC.md's Event Contracts: side effects of this transition (e.g. the
  // parent Order advancing to OUT_FOR_DELIVERY/DELIVERED) must land in the
  // same database transaction as the delivery status change itself.
  const delivery = await prisma.$transaction((tx) =>
    deliveryService.updateStatus(tx, storeId, deliveryId, input.status, {
      reason: input.reason,
      isManagerOrOwner,
    }),
  )
  const order = await orderService.getById(prisma, delivery.orderId)
  return ok(toDeliveryResponse(delivery, order.number))
}

export const POST = compose(withRequestContext, withErrorHandling)(handleUpdateStatus)
