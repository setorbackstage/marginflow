import type { Brand, ISODateTime } from "@/types/common"

export type OrganizationId = Brand<string, "OrganizationId">

export enum OrganizationType {
  Franchise = "FRANCHISE",
  RestaurantGroup = "RESTAURANT_GROUP",
  HoldingCompany = "HOLDING_COMPANY",
}

/**
 * The franchise or multi-company parent entity.
 * An Organization owns multiple Accounts (e.g., franchise HQ → franchise units).
 * This is a future domain — not part of the MVP.
 */
export interface Organization {
  readonly id: OrganizationId
  readonly name: string
  readonly type: OrganizationType
  readonly taxId: string | null
  readonly logoUrl: string | null
  readonly createdAt: ISODateTime
  readonly updatedAt: ISODateTime
}
