import "server-only"
import type { DbClient } from "../db"
import type { Menu, Prisma } from "../../generated/prisma/client"
import type { PaginationParams } from "./pagination"

/**
 * Pure data access for the `menus` table. Menus are hard-deleted per
 * DATA_MODEL.md's documented exception — `remove` performs a real delete,
 * not a soft delete.
 */
export const menuRepository = {
  /** Includes ordered sections and each section's Category — API_SPEC.md's `GET /menus/:menuId` response shape. */
  findById(db: DbClient, id: string) {
    return db.menu.findUnique({ where: { id }, include: { sections: { orderBy: { sortOrder: "asc" }, include: { category: true } } } })
  },

  exists(db: DbClient, id: string): Promise<boolean> {
    return db.menu.findUnique({ where: { id }, select: { id: true } }).then(Boolean)
  },

  /** `(store_id, name)` is unique. */
  findByStoreAndName(db: DbClient, storeId: string, name: string): Promise<Menu | null> {
    return db.menu.findUnique({ where: { storeId_name: { storeId, name } } })
  },

  /** Includes a count of the menu's sections — API_SPEC.md's list shape denormalizes `sectionCount` onto each row. */
  findManyByStore(
    db: DbClient,
    storeId: string,
    params: PaginationParams & { where?: Prisma.MenuWhereInput; orderBy?: Prisma.MenuOrderByWithRelationInput } = {},
  ) {
    return db.menu.findMany({
      where: { storeId, ...params.where },
      orderBy: params.orderBy,
      skip: params.skip,
      take: params.take,
      include: { _count: { select: { sections: true } } },
    })
  },

  count(db: DbClient, storeId: string, where: Prisma.MenuWhereInput = {}): Promise<number> {
    return db.menu.count({ where: { storeId, ...where } })
  },

  create(db: DbClient, data: Prisma.MenuCreateInput): Promise<Menu> {
    return db.menu.create({ data })
  },

  update(db: DbClient, id: string, data: Prisma.MenuUpdateInput): Promise<Menu> {
    return db.menu.update({ where: { id }, data })
  },

  remove(db: DbClient, id: string): Promise<Menu> {
    return db.menu.delete({ where: { id } })
  },
}
