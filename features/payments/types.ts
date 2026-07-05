export type PaymentStatus = "PENDING" | "PAID" | "PARTIALLY_REFUNDED" | "REFUNDED"
export type PaymentMethod = "CASH" | "CREDIT_CARD" | "DEBIT_CARD" | "PIX" | "VOUCHER" | "GIFT_CARD" | "ONLINE"

export interface PaymentListItem {
  id: string
  orderId: string
  orderNumber: number
  storeId: string
  amount: number
  refundedAmount: number
  status: PaymentStatus
  method: PaymentMethod
  gateway: string
  gatewayTransactionId: string | null
  paidAt: string | null
  refundedAt: string | null
  createdAt: string
}

export interface PaymentAttempt {
  id: string
  amount: number
  method: PaymentMethod
  gateway: string
  status: string
  gatewayTransactionId: string | null
  failureReason: string | null
  attemptedAt: string
  resolvedAt: string | null
}

export interface PaymentDetail {
  id: string
  orderId: string
  orderNumber: number
  amount: number
  refundedAmount: number
  status: PaymentStatus
  method: PaymentMethod
  gateway: string
  gatewayTransactionId: string | null
  refundedByUserId: string | null
  refundReason: string | null
  paidAt: string | null
  refundedAt: string | null
  attempts: PaymentAttempt[]
  createdAt: string
  updatedAt: string
}

export interface PaymentListParams {
  page?: number
  status?: PaymentStatus
}

export interface RefundPaymentInput {
  amount: number
  reason: string
}
