import "server-only"
import type { DbClient } from "../db"
import type { ModifierGroup, Prisma } from "../../generated/prisma/client"
import type { PaginationParams } from "./pagination"

/** Pure data access for the `modifier_groups` table. */
export const modifierGroupRepository = {
  findById(db: DbClient, id: string): Promise<ModifierGroup | null> {
    return db.modifierGroup.findUnique({ where: { id } })
  },

  exists(db: DbClient, id: string): Promise<boolean> {
    return db.modifierGroup.findUnique({ where: { id }, select: { id: true } }).then(Boolean)
  },

  /** `(product_id, name)` is unique. */
  findByProductAndName(db: DbClient, productId: string, name: string): Promise<ModifierGroup | null> {
    return db.modifierGroup.findUnique({ where: { productId_name: { productId, name } } })
  },

  /** Includes each group's active Modifiers — API_SPEC.md's `GET .../modifier-groups` response nests them. */
  findManyByProduct(
    db: DbClient,
    productId: string,
    params: PaginationParams & { where?: Prisma.ModifierGroupWhereInput } = {},
  ) {
    return db.modifierGroup.findMany({
      where: { productId, deletedAt: null, ...params.where },
      orderBy: { sortOrder: "asc" },
      skip: params.skip,
      take: params.take,
      include: { modifiers: { where: { deletedAt: null }, orderBy: { sortOrder: "asc" } } },
    })
  },

  count(db: DbClient, productId: string, where: Prisma.ModifierGroupWhereInput = {}): Promise<number> {
    return db.modifierGroup.count({ where: { productId, deletedAt: null, ...where } })
  },

  create(db: DbClient, data: Prisma.ModifierGroupCreateInput): Promise<ModifierGroup> {
    return db.modifierGroup.create({ data })
  },

  update(db: DbClient, id: string, data: Prisma.ModifierGroupUpdateInput): Promise<ModifierGroup> {
    return db.modifierGroup.update({ where: { id }, data })
  },

  softDelete(db: DbClient, id: string): Promise<ModifierGroup> {
    return db.modifierGroup.update({ where: { id }, data: { deletedAt: new Date() } })
  },
}
