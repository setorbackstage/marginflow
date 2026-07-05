import type { WeeklySchedule } from "@/types/common"

export interface StoreAddress {
  street: string | null
  number: string | null
  complement: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  country: string
  latitude: number | null
  longitude: number | null
}

export interface Store {
  id: string
  accountId: string
  name: string
  slug: string
  type: string
  status: string
  phone: string
  email: string
  logoUrl: string | null
  timezone: string
  currency: string
  minimumOrderValue: number
  deliveryFee: number
  operatingHours: WeeklySchedule
  address: StoreAddress
  createdAt: string
  updatedAt: string
}

export interface UpdateStoreInput {
  name?: string
  phone?: string
  email?: string
  deliveryFee?: number
  minimumOrderValue?: number
  operatingHours?: WeeklySchedule
  address?: Partial<StoreAddress>
}

export interface StoreSettings {
  storeId: string
  autoConfirmOrders: boolean
  printReceiptOnConfirm: boolean
  receiptFormat: string
  allowScheduledOrders: boolean
  maxScheduledDaysAhead: number
  acceptsCash: boolean
  acceptsCard: boolean
  acceptsPix: boolean
  acceptsVoucher: boolean
  acceptsOnlinePayment: boolean
  updatedAt: string
}

export type UpdateStoreSettingsInput = Partial<
  Omit<StoreSettings, "storeId" | "updatedAt">
>

export interface Role {
  id: string
  name: string
  displayName: string
  permissions: string[]
  isSystemRole: boolean
  memberCount: number
}
