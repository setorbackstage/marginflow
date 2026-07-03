import type { Brand, ISODateTime } from "@/types/common"
import type { CustomerId } from "./customer"

export type AddressId = Brand<string, "AddressId">

export type AddressLabel = "HOME" | "WORK" | "OTHER"

/**
 * A saved delivery address for a Customer.
 * Addresses are reusable across orders.
 *
 * IMPORTANT: When an Order is placed, the address is snapshotted into the Order
 * as an AddressSnapshot. Future changes to this Address record do not affect
 * historical orders.
 */
export interface Address {
  readonly id: AddressId
  readonly customerId: CustomerId
  readonly label: AddressLabel
  readonly street: string
  readonly number: string
  readonly complement: string | null
  readonly neighborhood: string
  readonly city: string
  readonly state: string           // ISO 3166-2 subdivision code (e.g., "SP", "RJ")
  readonly postalCode: string
  readonly country: string         // ISO 3166-1 alpha-2 (e.g., "BR")
  readonly latitude: number | null
  readonly longitude: number | null
  readonly isDefault: boolean
  readonly createdAt: ISODateTime
  readonly updatedAt: ISODateTime
}

/**
 * An immutable snapshot of an Address captured at order placement time.
 * Used inside Order to preserve historical delivery data regardless of
 * future changes to the customer's address book.
 */
export interface AddressSnapshot {
  readonly street: string
  readonly number: string
  readonly complement: string | null
  readonly neighborhood: string
  readonly city: string
  readonly state: string
  readonly postalCode: string
  readonly country: string
  readonly latitude: number | null
  readonly longitude: number | null
}
