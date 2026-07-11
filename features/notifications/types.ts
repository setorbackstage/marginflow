export interface Notification {
  id: string
  storeId: string
  userId: string | null
  type: "NEW_ORDER" | "ORDER_CANCELLED" | "PAYMENT_RECEIVED" | "PAYMENT_REFUNDED" | "DELIVERY_FAILED" | "STOCK_LOW" | "KITCHEN_READY" | "SYSTEM"
  title: string
  body: string
  link: string | null
  metadata: Record<string, unknown>
  readAt: string | null
  createdAt: string
}

export interface NotificationListResponse {
  items: Notification[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
  unread: number
}
