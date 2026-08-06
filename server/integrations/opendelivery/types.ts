import "server-only"

// ─────────────────────────────────────────────────────────────────────────
// Open Delivery v2 (Abrasel) — canonical types
// Reference: https://github.com/Abrasel-Nacional/opendelivery-v2
// These mirror the normative OpenAPI contract (docs/reference/v2/orders.openapi.yaml).
// The MarginFlow internal model uses Portuguese statuses (PENDING/CONFIRMED/…);
// this module is the neutral border that translates Open Delivery's English
// vocabulary into the MarginFlow domain. Adapters for any Open Delivery-compatible
// marketplace (not just iFood/99Food) plug in here.
// ─────────────────────────────────────────────────────────────────────────

/** Order fulfillment profile (discriminator). */
export type OdOrderType = "DELIVERY" | "TAKEOUT" | "INDOOR"

/** Authoritative order status (GET snapshot source of truth). */
export type OdOrderStatus =
  | "CREATED"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "IN_DELIVERY"
  | "DELIVERED"
  | "CANCELLED"
  | "CONCLUDED"

/**
 * Order lifecycle event types.
 * MUST events project a status change; MAY events can be informational only.
 * Logistics events (RIDER_ARRIVED_AT_STORE, DELIVERY_ONGOING, ARRIVED_AT_CUSTOMER,
 * PICKUP_ONGOING, ORDER_COLLECTED) MUST NOT redefine order.status.
 */
export type OdOrderEventType =
  | "CREATED"
  | "CONFIRMED"
  | "PREPARATION_REQUESTED"
  | "PREPARING"
  | "READY_FOR_PICKUP"
  | "PICKUP_ONGOING"
  | "RIDER_ARRIVED_AT_STORE"
  | "DISPATCHED"
  | "ORDER_COLLECTED"
  | "DELIVERY_ONGOING"
  | "ARRIVED_AT_CUSTOMER"
  | "DELIVERED"
  | "CANCELLATION_REQUESTED"
  | "CANCELLATION_REQUEST_ACCEPTED"
  | "CANCELLATION_REQUEST_DENIED"
  | "CANCELLED"
  | "CONCLUDED"

/** MarginFlow internal order status (Portuguese). */
export type MfOrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED"
  | "CONCLUDED"

export interface OdMoney {
  /** Amount in the minor unit (cents) when possible; Open Delivery sends floats too. */
  value: number
  currency?: string
}

export interface OdOrderItemOption {
  name: string
  /** Price addition in the order's currency unit. */
  priceAdjustment: number
}

export interface OdOrderItem {
  name: string
  quantity: number
  unitPrice: number
  options?: OdOrderItemOption[]
  observations?: string | null
}

export interface OdDeliveryAddress {
  street?: string
  number?: string
  complement?: string | null
  neighborhood?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  latitude?: number | null
  longitude?: number | null
  reference?: string | null
}

export interface OdFulfillment {
  orderType: OdOrderType
  delivery?: {
    deliveryAddress?: OdDeliveryAddress
    deliveredBy?: string | null
  }
  takeout?: Record<string, unknown>
  indoor?: Record<string, unknown>
}

export interface OdPayment {
  method: string
  /** true = prepaid online; false = collect at delivery/counter. */
  prepaid: boolean
  amount: number
  currency?: string
}

export interface OdOrder {
  id: string
  displayId?: string
  createdAt?: string
  sourceAppId?: string
  merchant?: { id: string }
  timing?: {
    orderTiming?: "IMMEDIATE" | "SCHEDULED"
    schedule?: string | null
    preparationStartDateTime?: string | null
  }
  fulfillment: OdFulfillment
  status?: OdOrderStatus
  items: OdOrderItem[]
  total: {
    subtotal?: number
    discounts?: number
    deliveryFee?: number
    additionalFees?: number
    grandTotal: number
  }
  payments?: OdPayment[]
  customer?: {
    name?: string | null
    phone?: string | null
    document?: string | null
  } | null
  observations?: string | null
}

export interface OdOrderEvent {
  eventId: string
  eventType: OdOrderEventType
  orderId: string
  orderURL?: string
  createdAt?: string
  sourceAppId?: string
}
