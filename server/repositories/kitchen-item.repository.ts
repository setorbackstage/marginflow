import "server-only"
import type { DbClient } from "../db"
import type { KitchenItem, Prisma } from "../../generated/prisma/client"

/**
 * Pure data access for the `kitchen_items` table. No business rules here.
 * No delete method — items are never removed, only transitioned via
 * `update` (their lifecycle is managed through the parent ticket).
 */
export const kitchenItemRepository = {
  findById(db: DbClient, id: string): Promise<KitchenItem | null> {
    return db.kitchenItem.findUnique({ where: { id } })
  },

  exists(db: DbClient, id: string): Promise<boolean> {
    return db.kitchenItem.findUnique({ where: { id }, select: { id: true } }).then(Boolean)
  },

  findManyByTicket(db: DbClient, ticketId: string): Promise<KitchenItem[]> {
    return db.kitchenItem.findMany({ where: { ticketId } })
  },

  count(db: DbClient, ticketId: string): Promise<number> {
    return db.kitchenItem.count({ where: { ticketId } })
  },

  create(db: DbClient, data: Prisma.KitchenItemCreateInput): Promise<KitchenItem> {
    return db.kitchenItem.create({ data })
  },

  createMany(db: DbClient, data: Prisma.KitchenItemCreateManyInput[]): Promise<Prisma.BatchPayload> {
    return db.kitchenItem.createMany({ data })
  },

  update(db: DbClient, id: string, data: Prisma.KitchenItemUpdateInput): Promise<KitchenItem> {
    return db.kitchenItem.update({ where: { id }, data })
  },
}
