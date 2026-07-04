import type { Brand, Cents, ISODateTime } from "@/types/common"
import type { StoreId } from "@/features/stores/types"

export type CustomerId = Brand<string, "CustomerId">

export enum CustomerStatus {
  Active = "ACTIVE",
  Blocked = "BLOCKED",
}

/**
 * A Customer is a person who has placed at least one Order at a Store.
 * Customers are always scoped to a Store — the same physical person may
 * appear as separate Customer records across different Stores.
 *
 * Customers are never Users. The two systems are kept strictly separate.
 */
export interface Customer {
  readonly id: CustomerId
  readonly storeId: StoreId
  readonly name: string
  readonly phone: string           // primary identifier in restaurant operations
  readonly email: string | null
  readonly taxId: string | null    // CPF — required for fiscal invoices
  readonly notes: string | null    // internal operator notes (e.g., "allergic to shellfish")
  readonly status: CustomerStatus
  readonly firstOrderAt: ISODateTime | null
  readonly lastOrderAt: ISODateTime | null
  readonly totalOrders: number     // denormalized count — kept consistent by the service layer
  readonly totalSpent: Cents       // denormalized sum — kept consistent by the service layer
  readonly createdAt: ISODateTime
  readonly updatedAt: ISODateTime
}
