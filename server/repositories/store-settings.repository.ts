import "server-only"
import type { DbClient } from "../db"
import type { StoreSettings, Prisma } from "../../generated/prisma/client"

/**
 * Pure data access for the `store_settings` table. Exactly one row per
 * Store (1:1) — there is no `findMany`/pagination here by design, and no
 * delete method: a Store's settings are cascade-deleted with the Store
 * itself at the database level, never through the API.
 */
export const storeSettingsRepository = {
  findByStoreId(db: DbClient, storeId: string): Promise<StoreSettings | null> {
    return db.storeSettings.findUnique({ where: { storeId } })
  },

  exists(db: DbClient, storeId: string): Promise<boolean> {
    return db.storeSettings.findUnique({ where: { storeId }, select: { id: true } }).then(Boolean)
  },

  create(db: DbClient, data: Prisma.StoreSettingsCreateInput): Promise<StoreSettings> {
    return db.storeSettings.create({ data })
  },

  updateByStoreId(db: DbClient, storeId: string, data: Prisma.StoreSettingsUpdateInput): Promise<StoreSettings> {
    return db.storeSettings.update({ where: { storeId }, data })
  },
}
