export type MenuStatus = "ACTIVE" | "INACTIVE" | "SCHEDULED"
export type MenuChannel = "DELIVERY" | "IN_STORE" | "MARKETPLACE" | "KIOSK"

export interface MenuListItem {
  id: string
  storeId: string
  name: string
  description: string | null
  status: MenuStatus
  channel: MenuChannel
  sectionCount: number
  createdAt: string
  updatedAt: string
}

export interface MenuSection {
  sortOrder: number
  isVisible: boolean
  category: { id: string; name: string; imageUrl: string | null }
}

export interface MenuDetail {
  id: string
  storeId: string
  name: string
  description: string | null
  status: MenuStatus
  channel: MenuChannel
  sections: MenuSection[]
  createdAt: string
  updatedAt: string
}

export interface CreateMenuInput {
  name: string
  description?: string | null
  channel: MenuChannel
}

export interface UpdateMenuInput {
  name?: string
  description?: string | null
}

export interface MenuSectionInput {
  categoryId: string
  sortOrder: number
  isVisible: boolean
}
