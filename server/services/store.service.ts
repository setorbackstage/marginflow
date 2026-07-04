import "server-only"
import type { DbClient } from "../db"
import type { Prisma, Store, StoreSettings } from "../../generated/prisma/client"
import { storeRepository, storeSettingsRepository, orderRepository } from "../repositories"
import { ConflictError, NotFoundError } from "../lib/errors"

/**
 * Fields a caller may change via `PATCH /stores/:storeId`. `slug` is
 * deliberately absent — API_SPEC.md: "immutable after creation and cannot
 * be updated."
 */
export interface UpdateStoreInput {
  name?: string
  phone?: string
  email?: string
  logoUrl?: string | null
  timezone?: string
  currency?: string
  minimumOrderValue?: number
  deliveryFee?: number
  operatingHours?: Prisma.InputJsonValue
  address?: {
    street?: string | null
    number?: string | null
    complement?: string | null
    neighborhood?: string | null
    city?: string | null
    state?: string | null
    postalCode?: string | null
    country?: string
    latitude?: number | null
    longitude?: number | null
  }
}

export interface UpdateStoreSettingsInput {
  autoConfirmOrders?: boolean
  printReceiptOnConfirm?: boolean
  receiptFormat?: string
  allowScheduledOrders?: boolean
  maxScheduledDaysAhead?: number
  acceptsCash?: boolean
  acceptsCard?: boolean
  acceptsPix?: boolean
  acceptsVoucher?: boolean
  acceptsOnlinePayment?: boolean
  notificationPreferences?: Prisma.InputJsonValue
}

async function getStoreOrThrow(db: DbClient, storeId: string): Promise<Store> {
  const store = await storeRepository.findById(db, storeId)
  if (!store) throw new NotFoundError("STORE_NOT_FOUND", "Store does not exist.")
  return store
}

export const storeService = {
  getById: getStoreOrThrow,

  /** `store.currency` change is blocked once the store has any orders. */
  async update(db: DbClient, storeId: string, input: UpdateStoreInput): Promise<Store> {
    await getStoreOrThrow(db, storeId)

    if (input.currency) {
      const orderCount = await orderRepository.count(db, { storeId })
      if (orderCount > 0) {
        throw new ConflictError("CURRENCY_CHANGE_BLOCKED", "Cannot change currency once the store has orders.")
      }
    }

    const { address, ...rest } = input
    return storeRepository.update(db, storeId, {
      ...rest,
      ...(address
        ? {
            addressStreet: address.street,
            addressNumber: address.number,
            addressComplement: address.complement,
            addressNeighborhood: address.neighborhood,
            addressCity: address.city,
            addressState: address.state,
            addressPostalCode: address.postalCode,
            addressCountry: address.country,
            addressLatitude: address.latitude,
            addressLongitude: address.longitude,
          }
        : {}),
    })
  },

  async getSettings(db: DbClient, storeId: string): Promise<StoreSettings> {
    const settings = await storeSettingsRepository.findByStoreId(db, storeId)
    if (!settings) throw new NotFoundError("STORE_SETTINGS_NOT_FOUND", "Store settings do not exist.")
    return settings
  },

  async updateSettings(db: DbClient, storeId: string, input: UpdateStoreSettingsInput): Promise<StoreSettings> {
    await getStoreOrThrow(db, storeId)
    return storeSettingsRepository.updateByStoreId(db, storeId, input)
  },
}
