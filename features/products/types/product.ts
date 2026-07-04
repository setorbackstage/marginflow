import type { Brand, Cents, ISODateTime, WeeklySchedule } from "@/types/common"
import type { StoreId } from "@/features/stores/types"
import type { CategoryId } from "./category"

export type ProductId = Brand<string, "ProductId">

export enum ProductType {
  Simple = "SIMPLE",       // a standard single-item product
  Combo = "COMBO",          // a bundle combining multiple products (future)
  ServiceCharge = "SERVICE_CHARGE", // e.g., a delivery fee or service fee line item
}

export enum ProductStatus {
  Active = "ACTIVE",
  Inactive = "INACTIVE",
  OutOfStock = "OUT_OF_STOCK",
}

/**
 * A sellable item offered by a Store.
 *
 * Key invariants:
 * - Products are never hardcoded — all exist in the database.
 * - A Product with status OUT_OF_STOCK cannot be added to new Orders.
 * - Products are soft-deleted, never physically removed.
 *   The productId on existing Order Items becomes a soft reference after deletion.
 * - All monetary values are in integer cents.
 */
export interface Product {
  readonly id: ProductId
  readonly storeId: StoreId
  readonly categoryId: CategoryId
  readonly name: string
  readonly description: string | null
  readonly price: Cents              // base price; final price includes modifier adjustments
  readonly imageUrl: string | null
  readonly sku: string | null
  readonly type: ProductType
  readonly status: ProductStatus
  readonly isAvailable: boolean      // computed: status === ACTIVE && within availabilitySchedule
  readonly availabilitySchedule: WeeklySchedule | null // null = always available when active
  readonly sortOrder: number
  readonly deletedAt: ISODateTime | null // soft delete timestamp; null = not deleted
  readonly createdAt: ISODateTime
  readonly updatedAt: ISODateTime
}
