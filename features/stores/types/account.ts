import type { Brand, ISODateTime } from "@/types/common"
import type { OrganizationId } from "./organization"

export type AccountId = Brand<string, "AccountId">

export enum AccountStatus {
  Active = "ACTIVE",
  Inactive = "INACTIVE",
  Suspended = "SUSPENDED",
  PastDue = "PAST_DUE",
}

export enum AccountPlan {
  Free = "FREE",
  Starter = "STARTER",
  Pro = "PRO",
  Enterprise = "ENTERPRISE",
}

/**
 * The top-level billing and subscription unit.
 * A single business owner has one Account, which may contain multiple Stores.
 * Authentication and billing are bound to the Account.
 */
export interface Account {
  readonly id: AccountId
  readonly organizationId: OrganizationId | null // null unless part of a franchise
  readonly name: string                          // legal business name
  readonly email: string                         // primary billing contact
  readonly phone: string | null
  readonly taxId: string | null                  // CNPJ or equivalent
  readonly plan: AccountPlan
  readonly status: AccountStatus
  readonly trialEndsAt: ISODateTime | null
  readonly createdAt: ISODateTime
  readonly updatedAt: ISODateTime
}
