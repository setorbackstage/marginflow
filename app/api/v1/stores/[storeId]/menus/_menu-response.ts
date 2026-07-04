import "server-only"
import type { Menu } from "@/generated/prisma/client"

/** API_SPEC.md `GET /api/v1/stores/:storeId/menus` — list item shape. `sectionCount` is denormalized. */
export function toMenuListItem(menu: Menu & { _count: { sections: number } }) {
  return {
    id: menu.id,
    storeId: menu.storeId,
    name: menu.name,
    description: menu.description,
    status: menu.status,
    channel: menu.channel,
    availabilitySchedule: menu.availabilitySchedule,
    sectionCount: menu._count.sections,
    createdAt: menu.createdAt,
    updatedAt: menu.updatedAt,
  }
}

interface MenuWithSections extends Menu {
  sections: {
    sortOrder: number
    isVisible: boolean
    category: { id: string; name: string; imageUrl: string | null }
  }[]
}

/** API_SPEC.md `GET /api/v1/stores/:storeId/menus/:menuId` — includes ordered sections and their Category. */
export function toMenuDetailResponse(menu: MenuWithSections) {
  return {
    id: menu.id,
    storeId: menu.storeId,
    name: menu.name,
    description: menu.description,
    status: menu.status,
    channel: menu.channel,
    availabilitySchedule: menu.availabilitySchedule,
    sections: menu.sections.map((section) => ({
      sortOrder: section.sortOrder,
      isVisible: section.isVisible,
      category: { id: section.category.id, name: section.category.name, imageUrl: section.category.imageUrl },
    })),
    createdAt: menu.createdAt,
    updatedAt: menu.updatedAt,
  }
}

/** `POST /menus/:menuId/publish` / `unpublish` — "returns the updated menu" without sections. */
export function toMenuResponse(menu: Menu) {
  return {
    id: menu.id,
    storeId: menu.storeId,
    name: menu.name,
    description: menu.description,
    status: menu.status,
    channel: menu.channel,
    availabilitySchedule: menu.availabilitySchedule,
    createdAt: menu.createdAt,
    updatedAt: menu.updatedAt,
  }
}
