import type { Brand } from "@/types/common"
import type { KitchenTicketId } from "./kitchen-ticket"
import type { KitchenItemStatus } from "./kitchen-status"

export type KitchenItemId = Brand<string, "KitchenItemId">

/**
 * A single production line within a Kitchen Ticket.
 * Derived from an Order Item but shaped for kitchen display.
 *
 * Stores only the data the kitchen staff needs:
 * - what to make
 * - how many
 * - any customizations
 * - any special instructions
 *
 * No pricing data is exposed to the kitchen.
 */
export interface KitchenItem {
  readonly id: KitchenItemId
  readonly ticketId: KitchenTicketId
  readonly productName: string
  readonly quantity: number
  readonly modifierSummary: readonly string[]  // human-readable modifier labels
  readonly notes: string | null
  readonly status: KitchenItemStatus
}
