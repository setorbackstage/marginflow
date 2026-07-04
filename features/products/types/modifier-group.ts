import type { Brand, ISODateTime } from "@/types/common"
import type { StoreId } from "@/features/stores/types"
import type { ProductId } from "./product"

export type ModifierGroupId = Brand<string, "ModifierGroupId">

/**
 * A Modifier Group defines a customization dimension for a Product.
 * Examples: "Choose your size", "Extra toppings", "Cooking preference"
 *
 * Validation rules (minSelections / maxSelections) are enforced at order creation time.
 * An Order Item with an unsatisfied required Modifier Group cannot be submitted.
 */
export interface ModifierGroup {
  readonly id: ModifierGroupId
  readonly storeId: StoreId
  readonly productId: ProductId
  readonly name: string           // e.g., "Escolha o tamanho"
  readonly description: string | null
  readonly isRequired: boolean    // true = customer must select at least minSelections options
  readonly minSelections: number  // 0 = optional; must be ≤ maxSelections
  readonly maxSelections: number  // 1 = single-choice; >1 = multi-select
  readonly sortOrder: number
  readonly isActive: boolean
  readonly deletedAt: ISODateTime | null // soft delete timestamp; null = not deleted
  readonly createdAt: ISODateTime
  readonly updatedAt: ISODateTime
}
