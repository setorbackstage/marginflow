import "server-only"
import type { Modifier, ModifierGroup, Product } from "@/generated/prisma/client"

/** API_SPEC.md `GET /api/v1/stores/:storeId/products` — list item shape. `categoryName`/`modifierGroupCount` are denormalized. */
export function toProductListItem(product: Product & { category: { name: string }; _count: { modifierGroups: number } }) {
  return {
    id: product.id,
    storeId: product.storeId,
    categoryId: product.categoryId,
    categoryName: product.category.name,
    name: product.name,
    description: product.description,
    price: product.price,
    imageUrl: product.imageUrl,
    sku: product.sku,
    type: product.type,
    status: product.status,
    isAvailable: product.isAvailable,
    sortOrder: product.sortOrder,
    modifierGroupCount: product._count.modifierGroups,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  }
}

function toModifierResponse(modifier: Modifier) {
  return {
    id: modifier.id,
    name: modifier.name,
    priceAdjustment: modifier.priceAdjustment,
    sku: modifier.sku,
    sortOrder: modifier.sortOrder,
    isActive: modifier.isActive,
  }
}

function toModifierGroupResponse(group: ModifierGroup & { modifiers: Modifier[] }) {
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    isRequired: group.isRequired,
    minSelections: group.minSelections,
    maxSelections: group.maxSelections,
    sortOrder: group.sortOrder,
    isActive: group.isActive,
    modifiers: group.modifiers.map(toModifierResponse),
  }
}

/** API_SPEC.md `GET /api/v1/stores/:storeId/products/:productId` — includes all active Modifier Groups and Modifiers. */
export function toProductDetailResponse(product: Product & { modifierGroups: (ModifierGroup & { modifiers: Modifier[] })[] }) {
  return {
    id: product.id,
    storeId: product.storeId,
    categoryId: product.categoryId,
    name: product.name,
    description: product.description,
    price: product.price,
    imageUrl: product.imageUrl,
    sku: product.sku,
    ifoodExternalCode: product.ifoodExternalCode,
    type: product.type,
    status: product.status,
    isAvailable: product.isAvailable,
    availabilitySchedule: product.availabilitySchedule,
    sortOrder: product.sortOrder,
    modifierGroups: product.modifierGroups.map(toModifierGroupResponse),
    deletedAt: product.deletedAt,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  }
}
