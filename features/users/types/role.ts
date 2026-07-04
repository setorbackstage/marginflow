import type { Brand, ISODateTime } from "@/types/common"
import type { StoreId } from "@/features/stores/types"
import type { Permission } from "./permission"

export type RoleId = Brand<string, "RoleId">

/**
 * Built-in system roles. Custom roles are planned for a future release.
 * Each predefined name has a fixed default permission set.
 */
export enum RoleName {
  Owner = "OWNER",
  Manager = "MANAGER",
  Cashier = "CASHIER",
  KitchenAttendant = "KITCHEN_ATTENDANT",
  DeliveryCoordinator = "DELIVERY_COORDINATOR",
  Analyst = "ANALYST",
}

/**
 * A Role is scoped to a Store.
 * The same user can hold different Roles in different Stores.
 */
export interface Role {
  readonly id: RoleId
  readonly storeId: StoreId
  readonly name: RoleName
  readonly displayName: string
  readonly permissions: readonly Permission[]
  readonly isSystemRole: boolean   // true = built-in, false = custom (future)
  readonly createdAt: ISODateTime
  readonly updatedAt: ISODateTime
}
