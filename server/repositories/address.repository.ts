import "server-only"
import type { DbClient } from "../db"
import type { Address, Prisma } from "../../generated/prisma/client"
import type { PaginationParams } from "./pagination"

/**
 * Pure data access for the `addresses` table. `deleted_at IS NULL` filtering
 * is applied here (mechanical, per DATA_MODEL.md's Soft Delete Strategy) —
 * deciding *whether* a delete is allowed is a Service-layer concern.
 */
export const addressRepository = {
  findById(db: DbClient, id: string): Promise<Address | null> {
    return db.address.findUnique({ where: { id } })
  },

  exists(db: DbClient, id: string): Promise<boolean> {
    return db.address.findUnique({ where: { id }, select: { id: true } }).then(Boolean)
  },

  findManyByCustomer(
    db: DbClient,
    customerId: string,
    params: PaginationParams & { where?: Prisma.AddressWhereInput; orderBy?: Prisma.AddressOrderByWithRelationInput } = {},
  ): Promise<Address[]> {
    return db.address.findMany({
      where: { customerId, deletedAt: null, ...params.where },
      orderBy: params.orderBy,
      skip: params.skip,
      take: params.take,
    })
  },

  count(db: DbClient, customerId: string): Promise<number> {
    return db.address.count({ where: { customerId, deletedAt: null } })
  },

  create(db: DbClient, data: Prisma.AddressCreateInput): Promise<Address> {
    return db.address.create({ data })
  },

  update(db: DbClient, id: string, data: Prisma.AddressUpdateInput): Promise<Address> {
    return db.address.update({ where: { id }, data })
  },

  softDelete(db: DbClient, id: string): Promise<Address> {
    return db.address.update({ where: { id }, data: { deletedAt: new Date() } })
  },
}
