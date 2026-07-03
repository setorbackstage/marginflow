import type { Brand } from "@/types/common"

export type OrderId = Brand<string, "OrderId">

/**
 * The Order lifecycle is a strict one-directional state machine.
 * No backward transitions are permitted under any circumstance.
 *
 * DRAFT → PENDING → CONFIRMED → PREPARING → READY → OUT_FOR_DELIVERY → DELIVERED
 *
 * CANCELLED can be reached from any status before DELIVERED.
 * CANCELLED requires a reason and the identity of who cancelled.
 */
export enum OrderStatus {
  Draft = "DRAFT",
  Pending = "PENDING",
  Confirmed = "CONFIRMED",
  Preparing = "PREPARING",
  Ready = "READY",
  OutForDelivery = "OUT_FOR_DELIVERY",
  Delivered = "DELIVERED",
  Cancelled = "CANCELLED",
}

/** The fulfillment method chosen for this Order. Determines delivery logistics. */
export enum OrderType {
  Delivery = "DELIVERY",
  Takeaway = "TAKEAWAY",
  DineIn = "DINE_IN",
}

/** The channel through which this Order entered the system. */
export enum OrderChannel {
  InStore = "IN_STORE",
  Phone = "PHONE",
  Marketplace = "MARKETPLACE",
  WhatsApp = "WHATSAPP",
  Kiosk = "KIOSK",
}
