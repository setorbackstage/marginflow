import "server-only"
import type { DbClient } from "../db"
import type { Payment, Prisma } from "../../generated/prisma/client"

/**
 * Pure data access for the `payments` table. No business rules here. No
 * delete method — DATA_MODEL.md: financial records are never deleted
 * under any circumstances.
 */
export const paymentRepository = {
  findById(db: DbClient, id: string): Promise<Payment | null> {
    return db.payment.findUnique({ where: { id } })
  },

  exists(db: DbClient, id: string): Promise<boolean> {
    return db.payment.findUnique({ where: { id }, select: { id: true } }).then(Boolean)
  },

  /** `order_id` is unique — one active Payment per Order. */
  findByOrderId(db: DbClient, orderId: string): Promise<Payment | null> {
    return db.payment.findUnique({ where: { orderId } })
  },

  /** Includes the parent Order's `number` — API_SPEC.md's list shape denormalizes `orderNumber` onto each row. */
  findManyByStore(
    db: DbClient,
    storeId: string,
    params: {
      where?: Prisma.PaymentWhereInput
      orderBy?: Prisma.PaymentOrderByWithRelationInput
      skip?: number
      take?: number
    } = {},
  ) {
    return db.payment.findMany({
      where: { storeId, ...params.where },
      orderBy: params.orderBy ?? { createdAt: "desc" },
      skip: params.skip,
      take: params.take,
      include: { order: { select: { number: true } } },
    })
  },

  count(db: DbClient, where: Prisma.PaymentWhereInput): Promise<number> {
    return db.payment.count({ where })
  },

  create(db: DbClient, data: Prisma.PaymentCreateInput): Promise<Payment> {
    return db.payment.create({ data })
  },

  update(db: DbClient, id: string, data: Prisma.PaymentUpdateInput): Promise<Payment> {
    return db.payment.update({ where: { id }, data })
  },
}
