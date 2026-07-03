import type { Brand, Cents, ISODateTime } from "@/types/common"
import type { StoreId } from "@/features/stores/types/store"
import type { OrderId } from "@/features/orders/types/order-status"
import type { PaymentMethod, PaymentGateway } from "./payment-method"

export type PaymentAttemptId = Brand<string, "PaymentAttemptId">

export enum PaymentAttemptStatus {
  Pending = "PENDING",
  Authorized = "AUTHORIZED",
  Captured = "CAPTURED",
  Declined = "DECLINED",
  Failed = "FAILED",
  Cancelled = "CANCELLED",
}

/**
 * A single attempt to process payment for an Order.
 * An Order may have multiple failed PaymentAttempts before a successful one.
 * PaymentAttempts are the audit trail of payment processing.
 *
 * The settled financial record (once an attempt succeeds) is captured in Payment.
 */
export interface PaymentAttempt {
  readonly id: PaymentAttemptId
  readonly orderId: OrderId
  readonly storeId: StoreId
  readonly amount: Cents
  readonly method: PaymentMethod
  readonly gateway: PaymentGateway
  readonly status: PaymentAttemptStatus
  readonly gatewayTransactionId: string | null
  readonly gatewayResponse: Record<string, unknown> | null // raw gateway payload for audit
  readonly failureReason: string | null
  readonly attemptedAt: ISODateTime
  readonly resolvedAt: ISODateTime | null
}
