import "server-only"
import type { DbClient } from "../db"
import type { Menu, MenuSection, Prisma } from "../../generated/prisma/client"
import { menuRepository, menuSectionRepository, categoryRepository } from "../repositories"
import { BadRequestError, ConflictError, NotFoundError } from "../lib/errors"
import { eventBus, createEvent } from "../lib/events"
import { toNullableJsonInput } from "../lib/json"

export interface CreateMenuInput {
  name: string
  description?: string | null
  channel: string
  status?: string
  availabilitySchedule?: Prisma.InputJsonValue | null
}

/** `status` is intentionally absent — API_SPEC.md: change it only via publish/unpublish. */
export interface UpdateMenuInput {
  name?: string
  description?: string | null
  availabilitySchedule?: Prisma.InputJsonValue | null
}

export interface MenuSectionInput {
  categoryId: string
  sortOrder: number
  isVisible: boolean
}

/** Store Isolation (API_SPEC.md): masks a menu belonging to another store as not-found. Includes ordered sections + Category (see `menuRepository.findById`). */
async function getMenuOrThrow(db: DbClient, storeId: string, id: string) {
  const menu = await menuRepository.findById(db, id)
  if (!menu || menu.storeId !== storeId) throw new NotFoundError("MENU_NOT_FOUND", "Menu does not exist in this store.")
  return menu
}

export const menuService = {
  getById: getMenuOrThrow,
  listByStore: menuRepository.findManyByStore,

  async create(db: DbClient, storeId: string, input: CreateMenuInput): Promise<Menu> {
    const existing = await menuRepository.findByStoreAndName(db, storeId, input.name)
    if (existing) throw new ConflictError("MENU_NAME_TAKEN", "A menu with this name already exists at this store.")
    return menuRepository.create(db, {
      ...input,
      availabilitySchedule: toNullableJsonInput(input.availabilitySchedule),
      store: { connect: { id: storeId } },
    })
  },

  async update(db: DbClient, storeId: string, id: string, input: UpdateMenuInput): Promise<Menu> {
    await getMenuOrThrow(db, storeId, id)
    return menuRepository.update(db, id, { ...input, availabilitySchedule: toNullableJsonInput(input.availabilitySchedule) })
  },

  async publish(db: DbClient, storeId: string, id: string): Promise<Menu> {
    const menu = await getMenuOrThrow(db, storeId, id)
    if (menu.status === "ACTIVE") throw new ConflictError("MENU_ALREADY_ACTIVE", "Menu is already ACTIVE.")

    const updated = await menuRepository.update(db, id, { status: "ACTIVE" })
    await eventBus.publish(
      createEvent("menu.published", storeId, null, {
        menuId: id,
        storeId,
        channel: menu.channel,
        publishedAt: new Date().toISOString(),
      }),
      db,
    )
    return updated
  },

  async unpublish(db: DbClient, storeId: string, id: string): Promise<Menu> {
    const menu = await getMenuOrThrow(db, storeId, id)
    if (menu.status !== "ACTIVE") throw new ConflictError("MENU_NOT_ACTIVE", "Menu is not currently ACTIVE.")

    const updated = await menuRepository.update(db, id, { status: "INACTIVE" })
    await eventBus.publish(
      createEvent("menu.unpublished", storeId, null, {
        menuId: id,
        storeId,
        channel: menu.channel,
        unpublishedAt: new Date().toISOString(),
      }),
      db,
    )
    return updated
  },

  /** Full-replace of a menu's sections. Omitted categories are removed from the menu. */
  async replaceSections(db: DbClient, storeId: string, menuId: string, sections: MenuSectionInput[]): Promise<MenuSection[]> {
    await getMenuOrThrow(db, storeId, menuId)

    for (const section of sections) {
      const category = await categoryRepository.findById(db, section.categoryId)
      if (!category || category.storeId !== storeId) {
        throw new BadRequestError("CATEGORY_NOT_FOUND", "Category does not exist or belongs to another store.")
      }
    }

    await menuSectionRepository.replaceForMenu(
      db,
      menuId,
      sections.map((section) => ({ ...section, menuId })),
    )
    return menuSectionRepository.findManyByMenu(db, menuId)
  },

  /** Hard delete — menus have no historical significance (DATA_MODEL.md's documented exception). */
  async remove(db: DbClient, storeId: string, id: string): Promise<Menu> {
    await getMenuOrThrow(db, storeId, id)
    return menuRepository.remove(db, id)
  },
}
