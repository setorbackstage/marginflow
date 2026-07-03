import type { Brand, Cents, ISODateTime } from "@/types/common"
import type { StoreId } from "@/features/stores/types/store"
import type { CustomerId } from "@/features/customers/types/customer"
import type { AddressSnapshot } from "@/features/customers/types/address"
import type { UserId } from "@/features/users/types/user"
import type { OrderId, OrderStatus, OrderType, OrderChannel } from "./order-status"
import type { OrderItemId } from "./order-item"

export type { OrderId }

/**
 * An append-only record of a single status transition.
 * The full history of an Order's lifecycle is reconstructed from these records.
 * Nothing is ever overwritten — only new entries are appended.
 */
export interface OrderStatusTransition {
  readonly status: OrderStatus
  readonly triggeredByUserId: UserId | null // null for system-triggered transitions
  readonly occurredAt: ISODateTime
  readonly notes: string | null
}

/**
 * The central entity of the MarginFlow system.
 *
 * Every business transaction starts as an Order.
 * An Order captures what was requested, by whom, from where, and how it will be fulfilled.
 *
 * Key invariants:
 * - Status transitions are one-directional and logged via statusHistory
 * - All item, price, and address data is snapshotted at placement time
 * - grand_total cannot change after the Order reaches CONFIRMED status
 * - Cancellation requires both a reason and the identity of who cancelled
 */
export interface Order {
  readonly id: OrderId
  readonly storeId: StoreId
  readonly customerId: CustomerId | null    // null for anonymous (walk-in) orders
  readonly number: number                   // human-readable sequential number per Store
  readonly status: OrderStatus
  readonly type: OrderType
  readonly channel: OrderChannel
  readonly tableNumber: string | null       // for DINE_IN orders
  readonly deliveryAddress: AddressSnapshot | null // null for DINE_IN and TAKEAWAY
  readonly itemIds: readonly OrderItemId[]
  readonly itemsTotal: Cents                // sum of all item subtotals
  readonly discountTotal: Cents             // total discounts applied
  readonly deliveryFee: Cents               // 0 for non-delivery orders
  readonly grandTotal: Cents                // itemsTotal − discountTotal + deliveryFee
  readonly notes: string | null             // order-level customer instruction
  readonly scheduledFor: ISODateTime | null // null for immediate orders
  readonly statusHistory: readonly OrderStatusTransition[]
  readonly cancelledReason: string | null   // required when status = CANCELLED
  readonly cancelledByUserId: UserId | null // required when status = CANCELLED
  readonly confirmedAt: ISODateTime | null
  readonly readyAt: ISODateTime | null
  readonly deliveredAt: ISODateTime | null
  readonly cancelledAt: ISODateTime | null
  readonly createdAt: ISODateTime
  readonly updatedAt: ISODateTime
}
