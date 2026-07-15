import "server-only"
import type { NextRequest } from "next/server"
import { prisma } from "@/server/db"
import { paymentService, orderService, authorizationService } from "@/server/services"
import { requireAuth, requireUuidParams, logAudit } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok } from "@/server/lib/http"
import { toPaymentDetailResponse } from "../../_payment-response"

interface RouteContext {
  params: Promise<{ storeId: string; paymentId: string }>
}

async function handleConfirmPayment(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, paymentId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "orders:edit")

  // API_SPEC.md's Event Contracts: confirming a payment cascades through the
  // synchronous bus (payment.paid → Customers' total_spent). All those writes
  // must land in the same database transaction as the payment status change —
  // same pattern as the order/kitchen/delivery status endpoints.
  const payment = await prisma.$transaction((tx) => paymentService.confirm(tx, storeId, paymentId))
  void logAudit(prisma, { storeId, userId: actor.userId, action: "payment.confirmed", entityType: "Payment", entityId: paymentId, entityRef: paymentId })
  const [order, attempts] = await Promise.all([
    orderService.getById(prisma, payment.orderId),
    paymentService.listAttemptsByOrder(prisma, payment.orderId),
  ])

  return ok(toPaymentDetailResponse(payment, order.number, attempts))
}

export const POST = compose(withRequestContext, withErrorHandling)(handleConfirmPayment)
