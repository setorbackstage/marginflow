import type { Brand, ISODateTime } from "@/types/common"
import type { StoreId } from "@/features/stores/types"
import type { OrderId, OrderType } from "@/features/orders/types"
import type { KitchenTicketStatus } from "./kitchen-status"
import type { KitchenItemId } from "./kitchen-item"

export type KitchenTicketId = Brand<string, "KitchenTicketId">

/**
 * The production document sent to the kitchen when an Order is confirmed.
 *
 * The Kitchen module operates exclusively through Tickets — kitchen staff
 * never interact with the Order entity directly. This separation ensures
 * the kitchen interface can evolve independently from the ordering interface.
 *
 * Key invariants:
 * - Created automatically and atomically when an Order transitions to CONFIRMED.
 * - A Kitchen Ticket for a cancelled Order is immediately marked CANCELLED.
 * - A Ticket cannot return to QUEUED once it has reached PREPARING.
 * - When a Ticket reaches READY, it triggers Delivery creation for DELIVERY orders.
 *
 * No pricing or payment data is present on the Ticket — the kitchen
 * is concerned only with production, not with financials.
 */
export interface KitchenTicket {
  readonly id: KitchenTicketId
  readonly storeId: StoreId
  readonly orderId: OrderId
  readonly orderNumber: number      // copied from Order for quick display
  readonly orderType: OrderType     // determines post-ready action (delivery vs. notify cashier)
  readonly status: KitchenTicketStatus
  readonly itemIds: readonly KitchenItemId[]
  readonly notes: string | null     // order-level production notes
  readonly queuedAt: ISODateTime    // when the ticket entered the queue
  readonly startedAt: ISODateTime | null
  readonly readyAt: ISODateTime | null
  readonly cancelledAt: ISODateTime | null
  readonly createdAt: ISODateTime
  readonly updatedAt: ISODateTime
}
