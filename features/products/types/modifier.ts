import type { Brand, Cents, ISODateTime } from "@/types/common"
import type { StoreId } from "@/features/stores/types"
import type { ModifierGroupId } from "./modifier-group"

export type ModifierId = Brand<string, "ModifierId">

/**
 * A single selectable option within a Modifier Group.
 * Examples: "Grande", "Borda recheada", "Ao ponto"
 *
 * priceAdjustment is added to the Order Item's unit price when this Modifier is selected.
 * It can be zero (no extra cost) or positive (surcharge). Negative values (discounts) are
 * permitted for combo pricing scenarios.
 *
 * Modifiers are snapshotted in Order Items — deleting a Modifier never corrupts history.
 */
export interface Modifier {
  readonly id: ModifierId
  readonly storeId: StoreId
  readonly modifierGroupId: ModifierGroupId
  readonly name: string
  readonly priceAdjustment: Cents  // 0 = no extra cost; >0 = surcharge; <0 = discount
  readonly sku: string | null
  readonly sortOrder: number
  readonly isActive: boolean
  readonly deletedAt: ISODateTime | null // soft delete timestamp; null = not deleted
  readonly createdAt: ISODateTime
  readonly updatedAt: ISODateTime
}
