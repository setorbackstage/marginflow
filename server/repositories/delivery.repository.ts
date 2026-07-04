import "server-only"
import type { DbClient } from "../db"
import type { Delivery, Prisma } from "../../generated/prisma/client"

/**
 * Pure data access for the `deliveries` table. No business rules here. No
 * delete method — deliveries are never removed, only transitioned via
 * `update` (terminal states are DELIVERED/FAILED/RETURNED).
 */
export const deliveryRepository = {
  findById(db: DbClient, id: string): Promise<Delivery | null> {
    return db.delivery.findUnique({ where: { id } })
  },

  exists(db: DbClient, id: string): Promise<boolean> {
    return db.delivery.findUnique({ where: { id }, select: { id: true } }).then(Boolean)
  },

  /** `order_id` is unique — one Delivery per Order. */
  findByOrderId(db: DbClient, orderId: string): Promise<Delivery | null> {
    return db.delivery.findUnique({ where: { orderId } })
  },

  /** Includes the parent Order's `number` — API_SPEC.md's list shape denormalizes `orderNumber` onto each row. */
  findManyByStore(
    db: DbClient,
    storeId: string,
    params: {
      where?: Prisma.DeliveryWhereInput
      orderBy?: Prisma.DeliveryOrderByWithRelationInput
      skip?: number
      take?: number
    } = {},
  ) {
    return db.delivery.findMany({
      where: { storeId, ...params.where },
      orderBy: params.orderBy ?? { createdAt: "desc" },
      skip: params.skip,
      take: params.take,
      include: { order: { select: { number: true } } },
    })
  },

  count(db: DbClient, where: Prisma.DeliveryWhereInput): Promise<number> {
    return db.delivery.count({ where })
  },

  create(db: DbClient, data: Prisma.DeliveryCreateInput): Promise<Delivery> {
    return db.delivery.create({ data })
  },

  update(db: DbClient, id: string, data: Prisma.DeliveryUpdateInput): Promise<Delivery> {
    return db.delivery.update({ where: { id }, data })
  },
}
