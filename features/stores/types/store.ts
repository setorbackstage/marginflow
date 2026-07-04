import type { Brand, Cents, ISODateTime, WeeklySchedule } from "@/types/common"
import type { AccountId } from "./account"

export type StoreId = Brand<string, "StoreId">

export enum StoreType {
  Restaurant = "RESTAURANT",
  DarkKitchen = "DARK_KITCHEN",
  Cafe = "CAFE",
  Bar = "BAR",
  Pizzeria = "PIZZERIA",
  BurgerShop = "BURGER_SHOP",
  FranchiseUnit = "FRANCHISE_UNIT",
}

export enum StoreStatus {
  Active = "ACTIVE",
  Inactive = "INACTIVE",
  Suspended = "SUSPENDED",
}

export enum StoreCurrency {
  BRL = "BRL",
  USD = "USD",
  EUR = "EUR",
}

/**
 * The Store's physical address.
 * Persisted as flat, indexed columns (see DATA_MODEL.md) — used for map
 * integrations and geographic reports. Distinct from AddressSnapshot,
 * which is an immutable copy captured on an Order at placement time.
 */
export interface StoreAddress {
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

export interface Store {
  readonly id: StoreId
  readonly accountId: AccountId
  readonly name: string
  readonly slug: string
  readonly type: StoreType
  readonly status: StoreStatus
  readonly phone: string
  readonly email: string
  readonly logoUrl: string | null
  readonly timezone: string         // IANA timezone string e.g. "America/Sao_Paulo"
  readonly currency: StoreCurrency
  readonly minimumOrderValue: Cents // 0 means no minimum
  readonly deliveryFee: Cents
  readonly operatingHours: WeeklySchedule
  readonly address: StoreAddress
  readonly createdAt: ISODateTime
  readonly updatedAt: ISODateTime
}
