export type OrderType = "DELIVERY" | "TAKEAWAY" | "DINE_IN"
export type OrderChannel = "IN_STORE" | "PHONE" | "MARKETPLACE" | "WHATSAPP" | "KIOSK"
export type OrderStatus = "DRAFT" | "PENDING" | "CONFIRMED" | "PREPARING" | "READY" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED"

export interface OrderListItem {
  id: string
  storeId: string
  number: number
  status: OrderStatus
  type: OrderType
  channel: OrderChannel
  customerId: string | null
  customerName: string | null
  customerPhone: string | null
  grandTotal: number
  itemsTotal: number
  discountTotal: number
  deliveryFee: number
  scheduledFor: string | null
  createdAt: string
  confirmedAt: string | null
  readyAt: string | null
  deliveredAt: string | null
  cancelledAt: string | null
}

export interface SelectedModifier {
  modifierId: string
  modifierGroupId: string
  name: string
  priceAdjustment: number
}

export interface OrderItem {
  id: string
  productId: string
  productName: string
  productPrice: number
  quantity: number
  selectedModifiers: SelectedModifier[]
  unitTotal: number
  subtotal: number
  notes: string | null
  status: string
}

export interface OrderDeliveryAddress {
  street: string
  number: string
  complement: string | null
  neighborhood: string
  city: string
  state: string
  postalCode: string
  country: string
  latitude: number | null
  longitude: number | null
}

export interface OrderStatusHistoryEntry {
  status: OrderStatus
  triggeredByUserId: string | null
  notes: string | null
  occurredAt: string
}

export interface OrderDetail {
  id: string
  storeId: string
  number: number
  status: OrderStatus
  type: OrderType
  channel: OrderChannel
  customerId: string | null
  customer: { id: string; name: string; phone: string } | null
  tableNumber: string | null
  deliveryAddress: OrderDeliveryAddress | null
  items: OrderItem[]
  itemsTotal: number
  discountTotal: number
  deliveryFee: number
  grandTotal: number
  notes: string | null
  scheduledFor: string | null
  statusHistory: OrderStatusHistoryEntry[]
  kitchenTicketId: string | null
  paymentId: string | null
  deliveryId: string | null
  cancelledReason: string | null
  cancelledByUserId: string | null
  confirmedAt: string | null
  readyAt: string | null
  deliveredAt: string | null
  cancelledAt: string | null
  createdAt: string
  updatedAt: string
}

export interface TimelineEntry {
  id: string
  status: OrderStatus
  triggeredByUser: { id: string; name: string } | null
  notes: string | null
  occurredAt: string
}

export interface CreateOrderItemInput {
  productId: string
  quantity: number
  selectedModifiers?: { modifierId: string; modifierGroupId: string }[]
  notes?: string | null
}

export interface CreateOrderInput {
  type: OrderType
  channel: OrderChannel
  customerId?: string | null
  deliveryAddressId?: string | null
  tableNumber?: string | null
  notes?: string | null
  scheduledFor?: string | null
  items: CreateOrderItemInput[]
}

export interface UpdateOrderItemInput {
  quantity?: number
  notes?: string | null
}

export interface OrderListParams {
  page?: number
  status?: string
  type?: OrderType
  search?: string
}
