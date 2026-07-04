import "server-only"
import type { DbClient } from "../db"
import type { PaymentAttempt, Prisma } from "../../generated/prisma/client"
import type { PaginationParams } from "./pagination"

/**
 * Pure data access for the `payment_attempts` table. No business rules
 * here. No delete method — DATA_MODEL.md: financial records are never
 * deleted under any circumstances; attempts are immutable once resolved.
 */
export const paymentAttemptRepository = {
  findById(db: DbClient, id: string): Promise<PaymentAttempt | null> {
    return db.paymentAttempt.findUnique({ where: { id } })
  },

  exists(db: DbClient, id: string): Promise<boolean> {
    return db.paymentAttempt.findUnique({ where: { id }, select: { id: true } }).then(Boolean)
  },

  /** `gateway_transaction_id` is unique when not null — used to match gateway webhooks. */
  findByGatewayTransactionId(db: DbClient, gatewayTransactionId: string): Promise<PaymentAttempt | null> {
    return db.paymentAttempt.findUnique({ where: { gatewayTransactionId } })
  },

  findManyByOrder(
    db: DbClient,
    orderId: string,
    params: PaginationParams = {},
  ): Promise<PaymentAttempt[]> {
    return db.paymentAttempt.findMany({
      where: { orderId },
      orderBy: { attemptedAt: "desc" },
      skip: params.skip,
      take: params.take,
    })
  },

  count(db: DbClient, orderId: string): Promise<number> {
    return db.paymentAttempt.count({ where: { orderId } })
  },

  create(db: DbClient, data: Prisma.PaymentAttemptCreateInput): Promise<PaymentAttempt> {
    return db.paymentAttempt.create({ data })
  },

  update(db: DbClient, id: string, data: Prisma.PaymentAttemptUpdateInput): Promise<PaymentAttempt> {
    return db.paymentAttempt.update({ where: { id }, data })
  },
}
