import "server-only"

/**
 * Every event shares this envelope — API_SPEC.md "Event Envelope".
 * `payload` is typed per event via the `DomainEvent` union below.
 */
export interface EventEnvelope<Type extends string, Payload> {
  eventId: string
  eventType: Type
  occurredAt: string
  storeId: string
  triggeredByUserId: string | null
  payload: Payload
}

export interface OrderCreatedPayload {
  orderId: string
  orderNumber: number
  type: string
  channel: string
  customerId: string | null
  grandTotal: number
  itemCount: number
}

export interface OrderConfirmedItemPayload {
  orderItemId: string
  /**
   * Additive, non-breaking field (API_SPEC.md Versioning) added for the
   * Inventory consumer's recipe lookup. Null only if the product was
   * hard-deleted (historical edge case; products are soft-deleted).
   */
  productId: string | null
  productName: string
  quantity: number
  modifierSummary: string[]
  notes: string | null
}

export interface OrderConfirmedPayload {
  orderId: string
  orderNumber: number
  type: string
  items: OrderConfirmedItemPayload[]
  orderNotes: string | null
  confirmedAt: string
}

export interface OrderReadyPayload {
  orderId: string
  orderNumber: number
  type: string
  readyAt: string
}

export interface OrderOutForDeliveryPayload {
  orderId: string
  orderNumber: number
  deliveryId: string
}

export interface OrderDeliveredPayload {
  orderId: string
  orderNumber: number
  customerId: string | null
  grandTotal: number
  type: string
  deliveredAt: string
}

export interface OrderCancelledPayload {
  orderId: string
  orderNumber: number
  previousStatus: string
  cancelledReason: string
  cancelledByUserId: string | null
  cancelledAt: string
  /**
   * Not part of API_SPEC.md's documented payload shape. Carries the
   * Controller-resolved RBAC decision ("does the acting user hold
   * manager-level delivery:update_status?") into the synchronous
   * order.cancelled consumer in Delivery, which enforces Business Rule 22
   * (dispatched deliveries require manager approval to cancel). Services
   * never compute this themselves — see delivery.service.ts.
   */
  isManagerApproved: boolean
}

export interface KitchenTicketCreatedPayload {
  ticketId: string
  orderId: string
  orderNumber: number
  orderType: string
  queuedAt: string
}

export interface KitchenTicketStatusChangedPayload {
  ticketId: string
  orderId: string
  previousStatus: string
  newStatus: string
  occurredAt: string
}

export interface DeliveryAddressSnapshotPayload {
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

export interface KitchenTicketReadyPayload {
  ticketId: string
  orderId: string
  orderNumber: number
  orderType: string
  readyAt: string
  deliveryAddressSnapshot: DeliveryAddressSnapshotPayload | null
}

export interface DeliveryCreatedPayload {
  deliveryId: string
  orderId: string
  orderNumber: number
  deliveryAddress: DeliveryAddressSnapshotPayload
  createdAt: string
}

export interface DeliveryDispatchedPayload {
  deliveryId: string
  orderId: string
  courierName: string | null
  courierType: string | null
  platform: string | null
  dispatchedAt: string
}

export interface DeliveryDeliveredPayload {
  deliveryId: string
  orderId: string
  deliveredAt: string
}

export interface DeliveryFailedPayload {
  deliveryId: string
  orderId: string
  failedReason: string
  failedAt: string
}

export interface PaymentCreatedPayload {
  paymentId: string
  orderId: string
  amount: number
  method: string
  gateway: string
}

export interface PaymentPaidPayload {
  paymentId: string
  orderId: string
  customerId: string | null
  amount: number
  method: string
  gateway: string
  paidAt: string
}

export interface PaymentRefundedPayload {
  paymentId: string
  orderId: string
  refundedAmount: number
  isFullRefund: boolean
  reason: string
  refundedByUserId: string
  refundedAt: string
}

export interface MembershipInvitedPayload {
  membershipId: string
  storeId: string
  storeName: string
  invitedEmail: string
  invitedName: string
  roleName: string
  invitedByUserId: string | null
  invitationToken: string
  expiresAt: string
}

export interface MenuPublishedPayload {
  menuId: string
  storeId: string
  channel: string
  publishedAt: string
}

export interface MenuUnpublishedPayload {
  menuId: string
  storeId: string
  channel: string
  unpublishedAt: string
}

export interface StockMovementCreatedPayload {
  movementId: string
  ingredientId: string
  ingredientName: string
  type: string
  quantityDelta: number
  unitCost: number
  /** Ingredient balance immediately after this movement. */
  currentStock: number
  /** Null for manual movements. */
  orderId: string | null
}

export interface StockLowPayload {
  ingredientId: string
  ingredientName: string
  unit: string
  currentStock: number
  minStock: number
}

export type DomainEvent =
  | EventEnvelope<"order.created", OrderCreatedPayload>
  | EventEnvelope<"order.confirmed", OrderConfirmedPayload>
  | EventEnvelope<"order.ready", OrderReadyPayload>
  | EventEnvelope<"order.out_for_delivery", OrderOutForDeliveryPayload>
  | EventEnvelope<"order.delivered", OrderDeliveredPayload>
  | EventEnvelope<"order.cancelled", OrderCancelledPayload>
  | EventEnvelope<"kitchen_ticket.created", KitchenTicketCreatedPayload>
  | EventEnvelope<"kitchen_ticket.status_changed", KitchenTicketStatusChangedPayload>
  | EventEnvelope<"kitchen_ticket.ready", KitchenTicketReadyPayload>
  | EventEnvelope<"delivery.created", DeliveryCreatedPayload>
  | EventEnvelope<"delivery.dispatched", DeliveryDispatchedPayload>
  | EventEnvelope<"delivery.delivered", DeliveryDeliveredPayload>
  | EventEnvelope<"delivery.failed", DeliveryFailedPayload>
  | EventEnvelope<"payment.created", PaymentCreatedPayload>
  | EventEnvelope<"payment.paid", PaymentPaidPayload>
  | EventEnvelope<"payment.refunded", PaymentRefundedPayload>
  | EventEnvelope<"membership.invited", MembershipInvitedPayload>
  | EventEnvelope<"menu.published", MenuPublishedPayload>
  | EventEnvelope<"menu.unpublished", MenuUnpublishedPayload>
  | EventEnvelope<"stock.movement_created", StockMovementCreatedPayload>
  | EventEnvelope<"stock.low", StockLowPayload>

export type DomainEventType = DomainEvent["eventType"]

export type DomainEventOf<Type extends DomainEventType> = Extract<DomainEvent, { eventType: Type }>
