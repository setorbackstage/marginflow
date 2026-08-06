import "server-only"
import type { MappedMarketplaceOrder, MappedOrderItem, MappedModifier, MappedDeliveryAddress, MappedPayment } from "../ifood/mapper"
import type {
  OdOrder,
  OdOrderEvent,
  OdOrderEventType,
  OdOrderStatus,
  OdOrderType,
  OdDeliveryAddress,
  MfOrderStatus,
} from "./types"

// ─────────────────────────────────────────────────────────────────────────
// Open Delivery v2 → MarginFlow internal model
// ─────────────────────────────────────────────────────────────────────────

function toCents(value: number | undefined): number {
  if (value == null) return 0
  // Open Delivery sends currency floats; we store integer cents.
  return Math.round(value * 100)
}

/** Open Delivery order type → MarginFlow order type. */
function mapOrderType(odType: OdOrderType): "DELIVERY" | "TAKEAWAY" | "DINE_IN" {
  switch (odType) {
    case "DELIVERY": return "DELIVERY"
    case "TAKEOUT": return "TAKEAWAY"
    case "INDOOR": return "DINE_IN"
    default: return "DELIVERY"
  }
}

const OD_METHOD_TO_MF: Record<string, string> = {
  CASH: "CASH",
  CREDIT: "CREDIT_CARD",
  CREDIT_CARD: "CREDIT_CARD",
  DEBIT: "DEBIT_CARD",
  DEBIT_CARD: "DEBIT_CARD",
  PIX: "PIX",
  MEAL_VOUCHER: "VOUCHER",
  FOOD_VOUCHER: "VOUCHER",
}

function mapPayment(payments: OdOrder["payments"]): MappedPayment | null {
  if (!payments || payments.length === 0) return null
  // MarginFlow convention: a single consolidated payment row.
  const prepaid = payments.every((p) => p.prepaid)
  const method = payments[0]?.method ?? "CASH"
  return {
    method: prepaid ? "ONLINE" : (OD_METHOD_TO_MF[method.toUpperCase()] ?? "CASH"),
    isPrepaid: prepaid,
  }
}

function mapAddress(addr?: OdDeliveryAddress): MappedDeliveryAddress | null {
  if (!addr) return null
  return {
    street: addr.street ?? "",
    number: addr.number ?? "S/N",
    complement: addr.complement ?? null,
    neighborhood: addr.neighborhood ?? "",
    city: addr.city ?? "",
    state: addr.state ?? "",
    postalCode: addr.postalCode ?? "",
    country: addr.country ?? "BR",
    latitude: addr.latitude ?? null,
    longitude: addr.longitude ?? null,
    reference: addr.reference ?? null,
  }
}

/** Maps an Open Delivery v2 order into the neutral MarginFlow marketplace order. */
export function mapOpenDeliveryOrder(order: OdOrder): MappedMarketplaceOrder {
  const items: MappedOrderItem[] = (order.items ?? []).map((item) => {
    const modifiers: MappedModifier[] = (item.options ?? []).map((opt) => ({
      name: opt.name,
      priceAdjustment: toCents(opt.priceAdjustment),
    }))
    const productPrice = toCents(item.unitPrice)
    const modifierTotal = modifiers.reduce((s, m) => s + m.priceAdjustment, 0)
    const unitTotal = productPrice + modifierTotal
    return {
      productName: item.name,
      productPrice,
      quantity: item.quantity,
      selectedModifiers: modifiers,
      unitTotal,
      subtotal: unitTotal * item.quantity,
      notes: item.observations ?? null,
    }
  })

  const itemsTotal = items.reduce((s, i) => s + i.subtotal, 0)
  const deliveryFee = toCents(order.total?.deliveryFee)
  const discountTotal = toCents(order.total?.discounts)
  const grandTotal = itemsTotal - discountTotal + deliveryFee

  const deliveryAddress =
    order.fulfillment.orderType === "DELIVERY"
      ? mapAddress(order.fulfillment.delivery?.deliveryAddress)
      : null

  const scheduledFor =
    order.timing?.orderTiming === "SCHEDULED" && order.timing.preparationStartDateTime
      ? new Date(order.timing.preparationStartDateTime)
      : null

  return {
    externalId: order.id,
    type: mapOrderType(order.fulfillment.orderType),
    channel: "MARKETPLACE",
    customerName: order.customer?.name ?? null,
    customerPhone: order.customer?.phone ?? null,
    customerDocument: order.customer?.document ?? null,
    deliveryAddress,
    itemsTotal,
    discountTotal,
    deliveryFee,
    grandTotal,
    notes: order.observations ?? null,
    scheduledFor,
    items,
    // Open Delivery does not model a separate "deliveredBy" token the same way;
    // INDOOR/TAKEOUT are merchant-handled, DELIVERY handled by the platform unless stated.
    deliveredBy:
      order.fulfillment.orderType === "DELIVERY"
        ? order.fulfillment.delivery?.deliveredBy ?? "MARKETPLACE"
        : null,
    payment: mapPayment(order.payments),
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Status / event translation (Open Delivery EN → MarginFlow PT)
// ─────────────────────────────────────────────────────────────────────────

/** Open Delivery authoritative status → MarginFlow status. */
export function mapOdStatusToMf(status: OdOrderStatus | undefined): MfOrderStatus | null {
  switch (status) {
    case "CREATED": return "PENDING"
    case "CONFIRMED": return "CONFIRMED"
    case "PREPARING": return "PREPARING"
    case "READY": return "READY"
    case "IN_DELIVERY": return "OUT_FOR_DELIVERY"
    case "DELIVERED": return "DELIVERED"
    case "CANCELLED": return "CANCELLED"
    case "CONCLUDED": return "CONCLUDED"
    default: return null
  }
}

/** MarginFlow status → Open Delivery status (for outbound snapshot). */
export function mapMfStatusToOd(status: MfOrderStatus): OdOrderStatus {
  switch (status) {
    case "PENDING": return "CREATED"
    case "CONFIRMED": return "CONFIRMED"
    case "PREPARING": return "PREPARING"
    case "READY": return "READY"
    case "OUT_FOR_DELIVERY": return "IN_DELIVERY"
    case "DELIVERED": return "DELIVERED"
    case "CANCELLED": return "CANCELLED"
    case "CONCLUDED": return "CONCLUDED"
  }
}

/**
 * Maps an Open Delivery event type to the MarginFlow status it projects.
 * Returns null for informational-only events (logistics, cancellation handshake)
 * that MUST NOT redefine order.status.
 */
export function mapOdEventToMfStatus(eventType: OdOrderEventType): MfOrderStatus | null {
  switch (eventType) {
    case "CREATED": return "PENDING"
    case "CONFIRMED": return "CONFIRMED"
    case "PREPARING": return "PREPARING"
    case "READY_FOR_PICKUP": return "READY"
    case "DISPATCHED": return "OUT_FOR_DELIVERY"
    case "DELIVERED": return "DELIVERED"
    case "CANCELLED": return "CANCELLED"
    case "CONCLUDED": return "CONCLUDED"
    // Informational / handshake events — never change authoritative status:
    case "PREPARATION_REQUESTED":
    case "PICKUP_ONGOING":
    case "RIDER_ARRIVED_AT_STORE":
    case "ORDER_COLLECTED":
    case "DELIVERY_ONGOING":
    case "ARRIVED_AT_CUSTOMER":
    case "CANCELLATION_REQUESTED":
    case "CANCELLATION_REQUEST_ACCEPTED":
    case "CANCELLATION_REQUEST_DENIED":
      return null
  }
}

/** Events that project a status change (MUST/MAY projecting). */
export function isStatusProjectingEvent(eventType: OdOrderEventType): boolean {
  return mapOdEventToMfStatus(eventType) !== null
}
