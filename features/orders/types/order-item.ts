import type { Brand, Cents, ISODateTime } from "@/types/common"
import type { ProductId, ModifierId, ModifierGroupId } from "@/features/products/types"
import type { OrderId } from "./order-status"

export type OrderItemId = Brand<string, "OrderItemId">

export enum OrderItemStatus {
  Pending = "PENDING",
  Preparing = "PREPARING",
  Ready = "READY",
  Cancelled = "CANCELLED",
}

/**
 * A snapshot of a Modifier selected by the customer at the time of ordering.
 * Immutable — renaming or deleting a Modifier in the catalog does not alter
 * historical order data.
 */
export interface SelectedModifier {
  readonly modifierId: ModifierId
  readonly modifierGroupId: ModifierGroupId
  readonly name: string             // snapshot of modifier name at order time
  readonly priceAdjustment: Cents   // snapshot of adjustment at order time (can be 0)
}

/**
 * A single line item within an Order.
 *
 * All product and modifier data is snapshotted at placement time.
 * Changes to the product catalog never alter existing Order Items.
 */
export interface OrderItem {
  readonly id: OrderItemId
  readonly orderId: OrderId
  readonly productId: ProductId | null // null if the product has since been deleted
  readonly productName: string         // snapshot of product name at order time
  readonly productPrice: Cents         // snapshot of base unit price at order time
  readonly quantity: number
  readonly selectedModifiers: readonly SelectedModifier[]
  readonly unitTotal: Cents            // productPrice + sum of modifier price adjustments
  readonly subtotal: Cents             // unitTotal × quantity
  readonly notes: string | null        // item-level customer instruction
  readonly status: OrderItemStatus
  readonly createdAt: ISODateTime
  readonly updatedAt: ISODateTime
}
