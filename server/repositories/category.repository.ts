import "server-only"
import type { DbClient } from "../db"
import type { Category, Prisma } from "../../generated/prisma/client"
import type { PaginationParams } from "./pagination"

/** Pure data access for the `categories` table. */
export const categoryRepository = {
  findById(db: DbClient, id: string): Promise<Category | null> {
    return db.category.findUnique({ where: { id } })
  },

  exists(db: DbClient, id: string): Promise<boolean> {
    return db.category.findUnique({ where: { id }, select: { id: true } }).then(Boolean)
  },

  /** `(store_id, name)` is unique. */
  findByStoreAndName(db: DbClient, storeId: string, name: string): Promise<Category | null> {
    return db.category.findUnique({ where: { storeId_name: { storeId, name } } })
  },

  findManyByStore(
    db: DbClient,
    storeId: string,
    params: PaginationParams & { where?: Prisma.CategoryWhereInput; orderBy?: Prisma.CategoryOrderByWithRelationInput } = {},
  ): Promise<Category[]> {
    return db.category.findMany({
      where: { storeId, deletedAt: null, ...params.where },
      orderBy: params.orderBy ?? { sortOrder: "asc" },
      skip: params.skip,
      take: params.take,
    })
  },

  count(db: DbClient, storeId: string, where: Prisma.CategoryWhereInput = {}): Promise<number> {
    return db.category.count({ where: { storeId, deletedAt: null, ...where } })
  },

  create(db: DbClient, data: Prisma.CategoryCreateInput): Promise<Category> {
    return db.category.create({ data })
  },

  update(db: DbClient, id: string, data: Prisma.CategoryUpdateInput): Promise<Category> {
    return db.category.update({ where: { id }, data })
  },

  softDelete(db: DbClient, id: string): Promise<Category> {
    return db.category.update({ where: { id }, data: { deletedAt: new Date() } })
  },
}
