import type { Brand, ISODateTime } from "@/types/common"
import type { StoreId } from "@/features/stores/types"
import type { OrderId } from "@/features/orders/types"
import type { AddressSnapshot } from "@/features/customers/types"
import type { CourierId, CourierType, DeliveryPlatform } from "./courier"

export type DeliveryId = Brand<string, "DeliveryId">

/**
 * The Delivery lifecycle follows the kitchen.
 * AWAITING_PICKUP is the entry status, only reachable after the Kitchen Ticket = READY.
 *
 * AWAITING_PICKUP → DISPATCHED → IN_TRANSIT → DELIVERED
 *                                            → FAILED → RETURNED
 */
export enum DeliveryStatus {
  AwaitingPickup = "AWAITING_PICKUP",
  Dispatched = "DISPATCHED",
  InTransit = "IN_TRANSIT",
  Delivered = "DELIVERED",
  Failed = "FAILED",
  Returned = "RETURNED",
}

/**
 * Tracks the physical movement of an Order from Store to Customer.
 *
 * Key invariants:
 * - A Delivery record is created automatically when the Kitchen Ticket reaches READY.
 * - Only applies to Orders of type = DELIVERY.
 * - deliveryAddress is an immutable snapshot — it cannot be changed after order placement.
 * - A Dispatched delivery cannot be cancelled without manager authorization.
 */
export interface Delivery {
  readonly id: DeliveryId
  readonly orderId: OrderId
  readonly storeId: StoreId
  readonly status: DeliveryStatus
  readonly courierId: CourierId | null      // null until a courier is assigned
  readonly courierName: string | null       // denormalized for quick display
  readonly courierPhone: string | null      // denormalized for quick display
  readonly courierType: CourierType | null
  readonly platform: DeliveryPlatform | null
  readonly platformDeliveryId: string | null // external reference for third-party platforms
  readonly deliveryAddress: AddressSnapshot
  readonly estimatedMinutes: number | null   // estimated delivery time in minutes
  readonly failedReason: string | null
  readonly dispatchedAt: ISODateTime | null
  readonly deliveredAt: ISODateTime | null
  readonly failedAt: ISODateTime | null
  readonly createdAt: ISODateTime
  readonly updatedAt: ISODateTime
}
