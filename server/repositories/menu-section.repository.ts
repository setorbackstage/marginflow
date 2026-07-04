import "server-only"
import type { DbClient } from "../db"
import type { MenuSection, Prisma } from "../../generated/prisma/client"

/**
 * Pure data access for the `menu_sections` join table. `replaceForMenu`
 * mirrors `PUT /menus/:menuId/sections` in API_SPEC.md — a full-replace
 * operation — but only performs the mechanical delete-then-insert; deciding
 * *when* to call it is a Service-layer concern.
 */
export const menuSectionRepository = {
  findManyByMenu(db: DbClient, menuId: string): Promise<MenuSection[]> {
    return db.menuSection.findMany({ where: { menuId }, orderBy: { sortOrder: "asc" } })
  },

  count(db: DbClient, menuId: string): Promise<number> {
    return db.menuSection.count({ where: { menuId } })
  },

  async replaceForMenu(db: DbClient, menuId: string, sections: Prisma.MenuSectionCreateManyInput[]): Promise<void> {
    await db.menuSection.deleteMany({ where: { menuId } })
    if (sections.length > 0) {
      await db.menuSection.createMany({ data: sections })
    }
  },
}
