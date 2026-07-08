import "server-only"
import { ifoodFetch } from "./client"

// ── iFood order shape (fields we actually use) ──────────────────────────────

export interface IfoodOrderOption {
  id: string
  name: string
  quantity: number
  unitPrice: number
  price: number
  addition: number
  externalCode?: string
}

export interface IfoodOrderOptionGroup {
  id: string
  groupName: string
  type: string
  options: IfoodOrderOption[]
}

export interface IfoodOrderItem {
  id: string
  externalCode?: string
  name: string
  quantity: number
  unit: string
  unitPrice: number
  price: number
  addition: number
  observations?: string
  optionGroups: IfoodOrderOptionGroup[]
}

export interface IfoodDeliveryAddress {
  formattedAddress?: string
  streetName?: string
  streetNumber?: string
  complement?: string
  reference?: string
  neighborhood?: string
  postalCode?: string
  city?: string
  state?: string
  country?: string
  coordinates?: { latitude: number; longitude: number }
}

export interface IfoodDelivery {
  /** "IFOOD" | "MERCHANT" */
  deliveredBy: string
  deliveryAddress?: IfoodDeliveryAddress
}

export interface IfoodPaymentMethod {
  value: number
  currency: string
  /** "CREDIT" | "DEBIT" | "MEAL_VOUCHER" | "CASH" | "PIX" | ... */
  method: string
  card?: string
  prepaid: boolean
  type: string
}

export interface IfoodTotal {
  subTotal: number
  deliveryFee: number
  additionalFees: number
  benefits: number
  orderAmount: number
}

export interface IfoodOrder {
  id: string
  /** "DELIVERY" | "TAKEOUT" | "INDOOR" */
  orderType: string
  /** "IMMEDIATE" | "SCHEDULED" */
  orderTiming: string
  salesChannel: string
  /** Human-readable order number, e.g. "ABC-123" */
  displayId: string
  createdAt: string
  preparationStartDateTime?: string
  merchant: { id: string; name: string }
  customer?: {
    id?: string
    name?: string
    phone?: { number?: string; localizer?: string }
    documentNumber?: string
  }
  items: IfoodOrderItem[]
  delivery?: IfoodDelivery
  payments?: {
    prepaid: number
    pending: number
    methods: IfoodPaymentMethod[]
  }
  total: IfoodTotal
}

// ── API calls ──────────────────────────────────────────────────────────────

export function fetchIfoodOrder(accessToken: string, orderId: string): Promise<IfoodOrder> {
  return ifoodFetch<IfoodOrder>(`/order/v1.0/orders/${orderId}`, accessToken)
}

export function confirmIfoodOrder(accessToken: string, orderId: string): Promise<void> {
  return ifoodFetch(`/order/v1.0/orders/${orderId}/confirm`, accessToken, { method: "POST" })
}

export function markIfoodOrderReadyToPickup(accessToken: string, orderId: string): Promise<void> {
  return ifoodFetch(`/order/v1.0/orders/${orderId}/readyToPickup`, accessToken, { method: "POST" })
}

export function dispatchIfoodOrder(accessToken: string, orderId: string, deliveredBy: "MERCHANT" | "IFOOD" = "MERCHANT"): Promise<void> {
  return ifoodFetch(`/order/v1.0/orders/${orderId}/dispatch`, accessToken, {
    method: "POST",
    body: JSON.stringify({ deliveredBy }),
  })
}

/**
 * Maps a MarginFlow free-text cancellation reason to an iFood reason code.
 * iFood codes:
 *  501 — Restaurant cannot prepare the order
 *  502 — Customer no longer wants the order
 *  503 — Restaurant cannot fulfil delivery
 *  504 — Duplicate order
 */
export function mapCancellationReason(reason: string | null | undefined): string {
  if (!reason) return "501"
  const r = reason.toLowerCase()
  if (r.includes("duplicad") || r.includes("duplicate")) return "504"
  if (r.includes("entrega") || r.includes("delivery") || r.includes("motoboy") || r.includes("courier")) return "503"
  if (r.includes("cliente") || r.includes("customer") || r.includes("não quer") || r.includes("desistiu")) return "502"
  return "501"
}

export function requestIfoodCancellation(accessToken: string, orderId: string, reason = "501"): Promise<void> {
  return ifoodFetch(`/order/v1.0/orders/${orderId}/requestCancellation`, accessToken, {
    method: "POST",
    body: JSON.stringify({ reason }),
  })
}
