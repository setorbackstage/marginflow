import type { Brand, Cents, ISODateTime } from "@/types/common"
import type { StoreId } from "@/features/stores/types"
import type { OrderId } from "@/features/orders/types"
import type { UserId } from "@/features/users/types"
import type { PaymentMethod, PaymentGateway } from "./payment-method"
import type { PaymentAttemptId } from "./payment-attempt"

export type PaymentId = Brand<string, "PaymentId">

export enum PaymentStatus {
  Pending = "PENDING",
  Authorized = "AUTHORIZED",
  Paid = "PAID",
  Refunded = "REFUNDED",
  PartiallyRefunded = "PARTIALLY_REFUNDED",
  Failed = "FAILED",
}

/**
 * The settled financial record for a completed Order.
 * One Order has at most one active Payment record.
 *
 * Key invariants:
 * - amount must equal order.grandTotal; discrepancies require manual reconciliation.
 * - Refunds require a manager or owner Role.
 * - refundReason is mandatory when status = REFUNDED or PARTIALLY_REFUNDED.
 * - This record feeds the Finance module. Finance never modifies it.
 */
export interface Payment {
  readonly id: PaymentId
  readonly orderId: OrderId
  readonly storeId: StoreId
  readonly amount: Cents
  readonly refundedAmount: Cents         // 0 unless partially or fully refunded
  readonly status: PaymentStatus
  readonly method: PaymentMethod
  readonly gateway: PaymentGateway
  readonly gatewayTransactionId: string | null
  readonly successfulAttemptId: PaymentAttemptId | null
  readonly refundedByUserId: UserId | null
  readonly refundReason: string | null   // required when status = REFUNDED or PARTIALLY_REFUNDED
  readonly paidAt: ISODateTime | null
  readonly refundedAt: ISODateTime | null
  readonly createdAt: ISODateTime
  readonly updatedAt: ISODateTime
}
