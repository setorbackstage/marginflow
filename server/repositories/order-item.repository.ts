import "server-only"
import type { DbClient } from "../db"
import type { OrderItem, Prisma } from "../../generated/prisma/client"

/** Pure data access for the `order_items` table. No business rules here. */
export const orderItemRepository = {
  findById(db: DbClient, id: string): Promise<OrderItem | null> {
    return db.orderItem.findUnique({ where: { id } })
  },

  exists(db: DbClient, id: string): Promise<boolean> {
    return db.orderItem.findUnique({ where: { id }, select: { id: true } }).then(Boolean)
  },

  findManyByOrder(db: DbClient, orderId: string): Promise<OrderItem[]> {
    return db.orderItem.findMany({ where: { orderId } })
  },

  count(db: DbClient, orderId: string): Promise<number> {
    return db.orderItem.count({ where: { orderId } })
  },

  create(db: DbClient, data: Prisma.OrderItemCreateInput): Promise<OrderItem> {
    return db.orderItem.create({ data })
  },

  createMany(db: DbClient, data: Prisma.OrderItemCreateManyInput[]): Promise<Prisma.BatchPayload> {
    return db.orderItem.createMany({ data })
  },

  update(db: DbClient, id: string, data: Prisma.OrderItemUpdateInput): Promise<OrderItem> {
    return db.orderItem.update({ where: { id }, data })
  },

  remove(db: DbClient, id: string): Promise<OrderItem> {
    return db.orderItem.delete({ where: { id } })
  },
}
