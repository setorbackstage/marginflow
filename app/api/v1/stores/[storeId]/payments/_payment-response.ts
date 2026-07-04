import "server-only"
import type { Payment, PaymentAttempt } from "@/generated/prisma/client"

/** API_SPEC.md `GET /api/v1/stores/:storeId/payments` — list item shape. `orderNumber` is denormalized from the parent Order. */
export function toPaymentListItem(payment: Payment & { order: { number: number } }) {
  return {
    id: payment.id,
    orderId: payment.orderId,
    orderNumber: payment.order.number,
    storeId: payment.storeId,
    amount: payment.amount,
    refundedAmount: payment.refundedAmount,
    status: payment.status,
    method: payment.method,
    gateway: payment.gateway,
    gatewayTransactionId: payment.gatewayTransactionId,
    paidAt: payment.paidAt,
    refundedAt: payment.refundedAt,
    createdAt: payment.createdAt,
  }
}

function toAttemptResponse(attempt: PaymentAttempt) {
  return {
    id: attempt.id,
    amount: attempt.amount,
    method: attempt.method,
    gateway: attempt.gateway,
    status: attempt.status,
    gatewayTransactionId: attempt.gatewayTransactionId,
    failureReason: attempt.failureReason,
    attemptedAt: attempt.attemptedAt,
    resolvedAt: attempt.resolvedAt,
  }
}

/** API_SPEC.md `GET /api/v1/stores/:storeId/payments/:paymentId` — single payment with attempts. */
export function toPaymentDetailResponse(payment: Payment, orderNumber: number, attempts: PaymentAttempt[]) {
  return {
    id: payment.id,
    orderId: payment.orderId,
    orderNumber,
    amount: payment.amount,
    refundedAmount: payment.refundedAmount,
    status: payment.status,
    method: payment.method,
    gateway: payment.gateway,
    gatewayTransactionId: payment.gatewayTransactionId,
    refundedByUserId: payment.refundedByUserId,
    refundReason: payment.refundReason,
    paidAt: payment.paidAt,
    refundedAt: payment.refundedAt,
    attempts: attempts.map(toAttemptResponse),
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  }
}
