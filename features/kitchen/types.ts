export type KitchenTicketStatus = "QUEUED" | "PREPARING" | "READY" | "CANCELLED"
export type KitchenItemStatus = "PENDING" | "PREPARING" | "READY"

export interface KitchenItem {
  id: string
  productName: string
  quantity: number
  modifierSummary: string[]
  notes: string | null
  status: KitchenItemStatus
}

export interface KitchenTicket {
  id: string
  storeId: string
  orderId: string
  orderNumber: number
  orderType: string
  status: KitchenTicketStatus
  notes: string | null
  items: KitchenItem[]
  queuedAt: string
  startedAt: string | null
  readyAt: string | null
  cancelledAt: string | null
  minutesInQueue: number
}
