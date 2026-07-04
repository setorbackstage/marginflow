import "server-only"
import type { DbClient } from "../db"
import type { Modifier, Prisma } from "../../generated/prisma/client"
import type { PaginationParams } from "./pagination"

/** Pure data access for the `modifiers` table. */
export const modifierRepository = {
  findById(db: DbClient, id: string): Promise<Modifier | null> {
    return db.modifier.findUnique({ where: { id } })
  },

  exists(db: DbClient, id: string): Promise<boolean> {
    return db.modifier.findUnique({ where: { id }, select: { id: true } }).then(Boolean)
  },

  /** `(modifier_group_id, name)` is unique. */
  findByGroupAndName(db: DbClient, modifierGroupId: string, name: string): Promise<Modifier | null> {
    return db.modifier.findUnique({ where: { modifierGroupId_name: { modifierGroupId, name } } })
  },

  findManyByModifierGroup(
    db: DbClient,
    modifierGroupId: string,
    params: PaginationParams & { where?: Prisma.ModifierWhereInput } = {},
  ): Promise<Modifier[]> {
    return db.modifier.findMany({
      where: { modifierGroupId, deletedAt: null, ...params.where },
      orderBy: { sortOrder: "asc" },
      skip: params.skip,
      take: params.take,
    })
  },

  count(db: DbClient, modifierGroupId: string, where: Prisma.ModifierWhereInput = {}): Promise<number> {
    return db.modifier.count({ where: { modifierGroupId, deletedAt: null, ...where } })
  },

  /** Used by the Service layer when validating an order's selected modifiers. */
  findManyByIds(db: DbClient, ids: string[]): Promise<Modifier[]> {
    return db.modifier.findMany({ where: { id: { in: ids } } })
  },

  create(db: DbClient, data: Prisma.ModifierCreateInput): Promise<Modifier> {
    return db.modifier.create({ data })
  },

  update(db: DbClient, id: string, data: Prisma.ModifierUpdateInput): Promise<Modifier> {
    return db.modifier.update({ where: { id }, data })
  },

  softDelete(db: DbClient, id: string): Promise<Modifier> {
    return db.modifier.update({ where: { id }, data: { deletedAt: new Date() } })
  },
}
