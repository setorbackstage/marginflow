import "server-only"
import type { DbClient } from "../db"
import type { Customer, Prisma } from "../../generated/prisma/client"

/**
 * Pure data access for the `customers` table. No business rules here. No
 * delete method — DATA_MODEL.md: Customers use `status = BLOCKED` for
 * lifecycle, never row removal.
 */
export const customerRepository = {
  findById(db: DbClient, id: string): Promise<Customer | null> {
    return db.customer.findUnique({ where: { id } })
  },

  exists(db: DbClient, id: string): Promise<boolean> {
    return db.customer.findUnique({ where: { id }, select: { id: true } }).then(Boolean)
  },

  /** `(store_id, phone)` is unique — the primary customer lookup path in restaurant operations. */
  findByStoreAndPhone(db: DbClient, storeId: string, phone: string): Promise<Customer | null> {
    return db.customer.findUnique({ where: { storeId_phone: { storeId, phone } } })
  },

  findManyByStore(
    db: DbClient,
    storeId: string,
    params: { where?: Prisma.CustomerWhereInput; orderBy?: Prisma.CustomerOrderByWithRelationInput; skip?: number; take?: number } = {},
  ): Promise<Customer[]> {
    return db.customer.findMany({
      where: { storeId, ...params.where },
      orderBy: params.orderBy ?? { lastOrderAt: "desc" },
      skip: params.skip,
      take: params.take,
    })
  },

  count(db: DbClient, where: Prisma.CustomerWhereInput): Promise<number> {
    return db.customer.count({ where })
  },

  create(db: DbClient, data: Prisma.CustomerCreateInput): Promise<Customer> {
    return db.customer.create({ data })
  },

  update(db: DbClient, id: string, data: Prisma.CustomerUpdateInput): Promise<Customer> {
    return db.customer.update({ where: { id }, data })
  },
}
