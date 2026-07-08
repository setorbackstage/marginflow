import "server-only"
import type { Ingredient } from "@/generated/prisma/client"

/**
 * API_SPEC.md ingredient object. Quantities are decimals in the ingredient's
 * base unit; `costPerUnit` is a decimal in cents per base unit (documented
 * exception to the integer-cents convention). `isLowStock` is derived:
 * minStock set and currentStock <= minStock.
 */
export function toIngredientResponse(ingredient: Ingredient) {
  const currentStock = Number(ingredient.currentStock)
  const minStock = ingredient.minStock === null ? null : Number(ingredient.minStock)
  return {
    id: ingredient.id,
    storeId: ingredient.storeId,
    name: ingredient.name,
    unit: ingredient.unit,
    currentStock,
    minStock,
    costPerUnit: Number(ingredient.costPerUnit),
    isLowStock: currentStock < 0 || (minStock !== null && currentStock <= minStock),
    status: ingredient.status,
    category: ingredient.category,
    createdAt: ingredient.createdAt,
    updatedAt: ingredient.updatedAt,
  }
}
