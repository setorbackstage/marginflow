import "server-only"
import type { DbClient } from "../db"
import type { Ingredient, Prisma } from "../../generated/prisma/client"
import type { PaginationParams } from "./pagination"

/** Pure data access for the `ingredients` table. */
export const ingredientRepository = {
  findById(db: DbClient, id: string): Promise<Ingredient | null> {
    return db.ingredient.findUnique({ where: { id } })
  },

  /** `(store_id, name)` is unique among non-deleted rows (partial index). */
  findByStoreAndName(db: DbClient, storeId: string, name: string): Promise<Ingredient | null> {
    return db.ingredient.findFirst({ where: { storeId, name, deletedAt: null } })
  },

  findManyByStore(
    db: DbClient,
    storeId: string,
    params: PaginationParams & { where?: Prisma.IngredientWhereInput; orderBy?: Prisma.IngredientOrderByWithRelationInput } = {},
  ): Promise<Ingredient[]> {
    return db.ingredient.findMany({
      where: { storeId, deletedAt: null, ...params.where },
      orderBy: params.orderBy ?? { name: "asc" },
      skip: params.skip,
      take: params.take,
    })
  },

  count(db: DbClient, storeId: string, where: Prisma.IngredientWhereInput = {}): Promise<number> {
    return db.ingredient.count({ where: { storeId, deletedAt: null, ...where } })
  },

  findManyByIds(db: DbClient, storeId: string, ids: string[]): Promise<Ingredient[]> {
    return db.ingredient.findMany({ where: { id: { in: ids }, storeId, deletedAt: null } })
  },

  /** Low-stock alert list: threshold configured and balance at or below it. */
  findLowStock(db: DbClient, storeId: string): Promise<Ingredient[]> {
    return db.ingredient.findMany({
      where: {
        storeId,
        deletedAt: null,
        minStock: { not: null },
        currentStock: { lte: db.ingredient.fields.minStock },
      },
      orderBy: { currentStock: "asc" },
    })
  },

  countLowStock(db: DbClient, storeId: string): Promise<number> {
    return db.ingredient.count({
      where: {
        storeId,
        deletedAt: null,
        minStock: { not: null },
        currentStock: { lte: db.ingredient.fields.minStock },
      },
    })
  },

  create(db: DbClient, data: Prisma.IngredientCreateInput): Promise<Ingredient> {
    return db.ingredient.create({ data })
  },

  update(db: DbClient, id: string, data: Prisma.IngredientUpdateInput): Promise<Ingredient> {
    return db.ingredient.update({ where: { id }, data })
  },

  /** Business Rule 38: balance change rides the same transaction as the movement insert. */
  incrementStock(db: DbClient, id: string, delta: Prisma.Decimal | number | string): Promise<Ingredient> {
    return db.ingredient.update({ where: { id }, data: { currentStock: { increment: delta } } })
  },

  softDelete(db: DbClient, id: string): Promise<Ingredient> {
    return db.ingredient.update({ where: { id }, data: { deletedAt: new Date() } })
  },
}
