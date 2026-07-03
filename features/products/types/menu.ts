import type { Brand, ISODateTime, WeeklySchedule } from "@/types/common"
import type { StoreId } from "@/features/stores/types/store"
import type { CategoryId } from "./category"

export type MenuId = Brand<string, "MenuId">

export enum MenuStatus {
  Active = "ACTIVE",
  Inactive = "INACTIVE",
  Scheduled = "SCHEDULED",
}

/** The ordering channel this Menu is published to. */
export enum MenuChannel {
  Delivery = "DELIVERY",
  InStore = "IN_STORE",
  Marketplace = "MARKETPLACE",
  Kiosk = "KIOSK",
}

/**
 * An ordered section within a Menu, mapping to one Category.
 * Allows display order to differ between Menus without altering Category definitions.
 */
export interface MenuSection {
  readonly categoryId: CategoryId
  readonly sortOrder: number
  readonly isVisible: boolean
}

/**
 * A Menu is a curated, channel-specific, time-bound view of the product catalog.
 * A Store may have multiple Menus (e.g., "Cardápio Delivery", "Cardápio Almoço").
 *
 * The Menu is the published artifact — ordering channels consume Menus, not raw Categories.
 * Changes to the Menu do not alter the underlying Products or Categories.
 */
export interface Menu {
  readonly id: MenuId
  readonly storeId: StoreId
  readonly name: string
  readonly description: string | null
  readonly status: MenuStatus
  readonly channel: MenuChannel
  readonly sections: readonly MenuSection[] // ordered list of visible categories
  readonly availabilitySchedule: WeeklySchedule | null // null = always available when active
  readonly createdAt: ISODateTime
  readonly updatedAt: ISODateTime
}
