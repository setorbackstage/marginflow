export interface Category {
  id: string
  storeId: string
  name: string
  description: string | null
  imageUrl: string | null
  sortOrder: number
  isActive: boolean
  productCount: number
  createdAt: string
  updatedAt: string
}

export interface CategoryInput {
  name: string
  description?: string | null
  imageUrl?: string | null
  sortOrder?: number
  isActive?: boolean
}

export type ProductType = "SIMPLE" | "COMBO" | "SERVICE_CHARGE"
export type ProductStatus = "ACTIVE" | "INACTIVE" | "OUT_OF_STOCK"

export interface ProductListItem {
  id: string
  storeId: string
  categoryId: string
  categoryName: string
  name: string
  description: string | null
  price: number
  imageUrl: string | null
  sku: string | null
  type: ProductType
  status: ProductStatus
  isAvailable: boolean
  sortOrder: number
  modifierGroupCount: number
  createdAt: string
  updatedAt: string
}

export interface Modifier {
  id: string
  modifierGroupId?: string
  name: string
  priceAdjustment: number
  sku: string | null
  sortOrder: number
  isActive: boolean
}

export interface ModifierGroup {
  id: string
  name: string
  description: string | null
  isRequired: boolean
  minSelections: number
  maxSelections: number
  sortOrder: number
  isActive: boolean
  modifiers: Modifier[]
}

export interface ProductDetail extends Omit<ProductListItem, "categoryName" | "modifierGroupCount"> {
  modifierGroups: ModifierGroup[]
  deletedAt: string | null
}

export interface ProductInput {
  categoryId: string
  name: string
  description?: string | null
  price: number
  imageUrl?: string | null
  sku?: string | null
  type?: ProductType
  status?: ProductStatus
  sortOrder?: number
}

export interface ModifierGroupInput {
  name: string
  description?: string | null
  isRequired: boolean
  minSelections: number
  maxSelections: number
  sortOrder?: number
  isActive?: boolean
}

export interface ModifierInput {
  name: string
  priceAdjustment?: number
  sku?: string | null
  sortOrder?: number
  isActive?: boolean
}

export interface ProductListParams {
  page?: number
  categoryId?: string
  status?: ProductStatus
  search?: string
}
