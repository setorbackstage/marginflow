import "server-only"
import type { DbClient } from "../db"
import type { Store, Prisma } from "../../generated/prisma/client"
import type { PaginationParams } from "./pagination"

/**
 * Pure data access for the `stores` table. No business rules here. No
 * delete method — API_SPEC.md documents no endpoint that removes a Store,
 * and DATA_MODEL.md's referential integrity rules block deleting a store
 * that has any operational data.
 */
export const storeRepository = {
  findById(db: DbClient, id: string): Promise<Store | null> {
    return db.store.findUnique({ where: { id } })
  },

  exists(db: DbClient, id: string): Promise<boolean> {
    return db.store.findUnique({ where: { id }, select: { id: true } }).then(Boolean)
  },

  /** `slug` is globally unique — used for store-facing URLs. */
  findBySlug(db: DbClient, slug: string): Promise<Store | null> {
    return db.store.findUnique({ where: { slug } })
  },

  findManyByAccount(
    db: DbClient,
    accountId: string,
    params: PaginationParams & { where?: Prisma.StoreWhereInput; orderBy?: Prisma.StoreOrderByWithRelationInput } = {},
  ): Promise<Store[]> {
    return db.store.findMany({
      where: { accountId, ...params.where },
      orderBy: params.orderBy ?? { createdAt: "desc" },
      skip: params.skip,
      take: params.take,
    })
  },

  count(db: DbClient, where: Prisma.StoreWhereInput = {}): Promise<number> {
    return db.store.count({ where })
  },

  create(db: DbClient, data: Prisma.StoreCreateInput): Promise<Store> {
    return db.store.create({ data })
  },

  update(db: DbClient, id: string, data: Prisma.StoreUpdateInput): Promise<Store> {
    return db.store.update({ where: { id }, data })
  },
}
