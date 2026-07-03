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
  readonly createdAt: ISODateTime
  readonly updatedAt: ISODateTime
}
