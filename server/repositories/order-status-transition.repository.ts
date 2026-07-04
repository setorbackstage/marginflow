import "server-only"
import type { DbClient } from "../db"
import type { OrderStatusTransition, Prisma } from "../../generated/prisma/client"

/**
 * Pure data access for the `order_status_transitions` table. Append-only —
 * there is no update or delete method, matching DATA_MODEL.md exactly.
 */
export const orderStatusTransitionRepository = {
  findManyByOrder(db: DbClient, orderId: string): Promise<OrderStatusTransition[]> {
    return db.orderStatusTransition.findMany({ where: { orderId }, orderBy: { occurredAt: "desc" } })
  },

  count(db: DbClient, orderId: string): Promise<number> {
    return db.orderStatusTransition.count({ where: { orderId } })
  },

  create(db: DbClient, data: Prisma.OrderStatusTransitionCreateInput): Promise<OrderStatusTransition> {
    return db.orderStatusTransition.create({ data })
  },
}
