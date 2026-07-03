import type { Brand, ISODateTime } from "@/types/common"
import type { StoreId } from "@/features/stores/types/store"

export type CategoryId = Brand<string, "CategoryId">

/**
 * A Category organizes Products into logical groups within the catalog.
 * Categories have no operational role — they exist solely for display and organization.
 *
 * A Category cannot be deleted while it has active Products.
 */
export interface Category {
  readonly id: CategoryId
  readonly storeId: StoreId
  readonly name: string
  readonly description: string | null
  readonly imageUrl: string | null
  readonly sortOrder: number
  readonly isActive: boolean
  readonly createdAt: ISODateTime
  readonly updatedAt: ISODateTime
}
