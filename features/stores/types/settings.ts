import type { ISODateTime } from "@/types/common"
import type { StoreId } from "./store"

export enum ReceiptFormat {
  A4 = "A4",
  Thermal80mm = "THERMAL_80MM",
  Thermal58mm = "THERMAL_58MM",
}

export enum NotificationChannel {
  InApp = "IN_APP",
  Email = "EMAIL",
  WhatsApp = "WHATSAPP",
  SMS = "SMS",
}

export interface NotificationPreferences {
  readonly newOrder: readonly NotificationChannel[]
  readonly orderCancelled: readonly NotificationChannel[]
  readonly lowStock: readonly NotificationChannel[]
  readonly paymentFailed: readonly NotificationChannel[]
}

/**
 * Operational configuration for a Store.
 * Separated from Store to keep the core entity lean and allow
 * settings to evolve independently from identity fields.
 */
export interface StoreSettings {
  readonly id: string
  readonly storeId: StoreId
  readonly autoConfirmOrders: boolean      // skip manual confirmation step
  readonly printReceiptOnConfirm: boolean
  readonly receiptFormat: ReceiptFormat
  readonly allowScheduledOrders: boolean
  readonly maxScheduledDaysAhead: number   // how many days in advance orders can be scheduled
  readonly acceptsCash: boolean
  readonly acceptsCard: boolean
  readonly acceptsPix: boolean
  readonly acceptsVoucher: boolean
  readonly acceptsOnlinePayment: boolean
  readonly notifications: NotificationPreferences
  readonly updatedAt: ISODateTime
}
