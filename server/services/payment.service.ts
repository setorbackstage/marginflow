import "server-only"
import type { DbClient } from "../db"
import type { Payment } from "../../generated/prisma/client"
import { paymentRepository, paymentAttemptRepository, orderRepository, storeSettingsRepository } from "../repositories"
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "../lib/errors"
import { eventBus, createEvent } from "../lib/events"
import { authorizationService } from "./authorization.service"

export interface InitiatePaymentInput {
  method: string
  gateway?: string
  amount?: number
}

export interface RefundPaymentInput {
  amount: number
  reason: string
}

const UNPAYABLE_ORDER_STATUSES = ["DRAFT", "PENDING", "CANCELLED"]

/** Maps a payment method to the StoreSettings flag that must be `true` to accept it. `GIFT_CARD` has no gating flag in DATA_MODEL.md. */
const METHOD_SETTING_FIELD: Record<string, "acceptsCash" | "acceptsCard" | "acceptsPix" | "acceptsVoucher" | "acceptsOnlinePayment"> = {
  CASH: "acceptsCash",
  CREDIT_CARD: "acceptsCard",
  DEBIT_CARD: "acceptsCard",
  PIX: "acceptsPix",
  VOUCHER: "acceptsVoucher",
  ONLINE: "acceptsOnlinePayment",
}

/** Store Isolation (API_SPEC.md): masks a payment belonging to another store as not-found. */
async function getPaymentOrThrow(db: DbClient, storeId: string, id: string): Promise<Payment> {
  const payment = await paymentRepository.findById(db, id)
  if (!payment || payment.storeId !== storeId) throw new NotFoundError("PAYMENT_NOT_FOUND", "Payment does not exist in this store.")
  return payment
}

export const paymentService = {
  getById: getPaymentOrThrow,
  listByStore: paymentRepository.findManyByStore,
  count: paymentRepository.count,
  listAttemptsByOrder: paymentAttemptRepository.findManyByOrder,

  /** `POST /orders/:orderId/payment` — creates a Payment (PENDING) and its initiating PaymentAttempt. */
  async initiate(db: DbClient, storeId: string, orderId: string, input: InitiatePaymentInput): Promise<{ payment: Payment; attemptId: string }> {
    const order = await orderRepository.findById(db, orderId)
    if (!order || order.storeId !== storeId) throw new NotFoundError("ORDER_NOT_FOUND", "Order does not exist in this store.")
    if (UNPAYABLE_ORDER_STATUSES.includes(order.status)) {
      throw new BadRequestError("ORDER_NOT_PAYABLE", "Order is in DRAFT, PENDING, or CANCELLED status.")
    }

    const existing = await paymentRepository.findByOrderId(db, orderId)
    if (existing?.status === "PAID") {
      throw new ConflictError("PAYMENT_ALREADY_EXISTS", "A PAID payment already exists for this order.")
    }

    const settings = await storeSettingsRepository.findByStoreId(db, storeId)
    const settingField = METHOD_SETTING_FIELD[input.method]
    if (settingField && settings && !settings[settingField]) {
      throw new BadRequestError("PAYMENT_METHOD_NOT_ACCEPTED", "The store does not accept this payment method.")
    }

    const amount = input.amount ?? order.grandTotal
    if (amount !== order.grandTotal) {
      throw new BadRequestError("PAYMENT_AMOUNT_MISMATCH", "Payment amount does not equal order grand_total.")
    }

    const gateway = input.gateway ?? "MANUAL"
    const payment =
      existing ??
      (await paymentRepository.create(db, {
        order: { connect: { id: orderId } },
        store: { connect: { id: storeId } },
        amount,
        method: input.method,
        gateway,
      }))

    const attempt = await paymentAttemptRepository.create(db, {
      order: { connect: { id: orderId } },
      store: { connect: { id: storeId } },
      amount,
      method: input.method,
      gateway,
    })

    await eventBus.publish(
      createEvent("payment.created", storeId, null, { paymentId: payment.id, orderId, amount, method: input.method, gateway }),
      db,
    )

    return { payment, attemptId: attempt.id }
  },

  /** `POST /payments/:paymentId/confirm` — marks a manual payment as received. */
  async confirm(db: DbClient, storeId: string, paymentId: string): Promise<Payment> {
    const payment = await getPaymentOrThrow(db, storeId, paymentId)

    // Idempotent confirm: a payment that already reached PAID (or a later
    // refund state) must not re-run the capture side effects. Re-publishing
    // payment.paid would double-count customer.total_spent and record a
    // duplicate attempt. API_SPEC.md documents no error for this case, so we
    // return the already-settled payment unchanged (still 200 OK, status PAID).
    if (payment.status === "PAID" || payment.status === "PARTIALLY_REFUNDED" || payment.status === "REFUNDED") {
      return payment
    }

    const attempts = await paymentAttemptRepository.findManyByOrder(db, payment.orderId)
    const pendingAttempt = attempts.find((attempt) => attempt.status === "PENDING")

    const paidAt = new Date()
    if (pendingAttempt) {
      await paymentAttemptRepository.update(db, pendingAttempt.id, { status: "CAPTURED", resolvedAt: paidAt })
    }

    const updated = await paymentRepository.update(db, paymentId, {
      status: "PAID",
      paidAt,
      successfulAttempt: pendingAttempt ? { connect: { id: pendingAttempt.id } } : undefined,
    })

    const order = await orderRepository.findById(db, payment.orderId)
    await eventBus.publish(
      createEvent("payment.paid", storeId, null, {
        paymentId,
        orderId: payment.orderId,
        customerId: order?.customerId ?? null,
        amount: payment.amount,
        method: payment.method,
        gateway: payment.gateway,
        paidAt: paidAt.toISOString(),
      }),
      db,
    )

    return updated
  },

  /**
   * `POST /payments/:paymentId/refund`. Requires the `orders:refund`
   * permission — Business Rule 25 ("only managers and owners"), enforced
   * here via `authorizationService` so the rule lives in the Service layer,
   * not the Controller.
   */
  async refund(db: DbClient, storeId: string, paymentId: string, input: RefundPaymentInput, refundedByUserId: string): Promise<Payment> {
    const canRefund = await authorizationService.hasPermission(db, refundedByUserId, storeId, "orders:refund")
    if (!canRefund) {
      throw new ForbiddenError("INSUFFICIENT_PERMISSIONS", "Refunds require the orders:refund permission (manager or owner).")
    }

    const payment = await getPaymentOrThrow(db, storeId, paymentId)
    if (payment.status !== "PAID" && payment.status !== "PARTIALLY_REFUNDED") {
      throw new BadRequestError("PAYMENT_NOT_REFUNDABLE", "Payment is not in PAID or PARTIALLY_REFUNDED status.")
    }

    const remaining = payment.amount - payment.refundedAmount
    if (input.amount > remaining) {
      throw new BadRequestError("REFUND_EXCEEDS_PAID_AMOUNT", "Refund amount exceeds the remaining refundable amount.")
    }

    const refundedAmount = payment.refundedAmount + input.amount
    const isFullRefund = refundedAmount >= payment.amount
    const refundedAt = new Date()

    const updated = await paymentRepository.update(db, paymentId, {
      refundedAmount,
      status: isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED",
      refundReason: input.reason,
      refundedByUser: { connect: { id: refundedByUserId } },
      refundedAt,
    })

    await eventBus.publish(
      createEvent("payment.refunded", storeId, refundedByUserId, {
        paymentId,
        orderId: payment.orderId,
        refundedAmount: input.amount,
        isFullRefund,
        reason: input.reason,
        refundedByUserId,
        refundedAt: refundedAt.toISOString(),
      }),
      db,
    )

    return updated
  },
}
