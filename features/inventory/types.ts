export type IngredientUnit = "G" | "ML" | "UN"
export type IngredientStatus = "ACTIVE" | "INACTIVE"
export type MovementType = "ENTRY" | "EXIT" | "ADJUSTMENT" | "LOSS" | "SALE_CONSUMPTION" | "SALE_REVERSAL"
export type ManualMovementType = "ENTRY" | "EXIT" | "ADJUSTMENT" | "LOSS"
export type AlertSeverity = "NEGATIVE" | "OUT" | "LOW"

export interface Ingredient {
  id: string
  storeId: string
  name: string
  unit: IngredientUnit
  currentStock: number
  minStock: number | null
  /** Decimal cents per base unit (the documented NUMERIC exception). */
  costPerUnit: number
  isLowStock: boolean
  status: IngredientStatus
  createdAt: string
  updatedAt: string
}

export interface IngredientDetail extends Ingredient {
  usedInRecipes: { recipeId: string; productId: string; productName: string }[]
}

export interface IngredientInput {
  name: string
  unit: IngredientUnit
  costPerUnit?: number
  minStock?: number | null
  status?: IngredientStatus
}

export interface IngredientListParams {
  page?: number
  search?: string
  status?: IngredientStatus
  lowStock?: boolean
}

export interface StockMovement {
  id: string
  storeId: string
  ingredientId: string
  ingredientName: string
  ingredientUnit: IngredientUnit
  type: MovementType
  quantityDelta: number
  unitCost: number
  orderId: string | null
  orderNumber: number | null
  reason: string | null
  createdByUserId: string | null
  createdByUserName: string | null
  createdAt: string
}

export interface MovementInput {
  ingredientId: string
  type: ManualMovementType
  quantity: number
  direction?: "INCREASE" | "DECREASE"
  reason?: string | null
  costPerUnit?: number
}

export interface MovementListParams {
  page?: number
  ingredientId?: string
  type?: MovementType
  dateFrom?: string
  dateTo?: string
}

export interface LowStockAlert {
  ingredientId: string
  ingredientName: string
  unit: IngredientUnit
  currentStock: number
  minStock: number
  severity: AlertSeverity
}

export interface RecipeItem {
  id: string
  ingredientId: string
  ingredientName: string
  ingredientUnit: IngredientUnit
  quantity: number
  wastePct: number
  effectiveQuantityPerUnit: number
  itemCostPerUnit: number
}

export interface Recipe {
  id: string
  storeId: string
  productId: string
  yieldQuantity: number
  notes: string | null
  items: RecipeItem[]
  /** Decimal cents, computed at read time. */
  costPerUnit: number
  productPrice: number
  marginPct: number | null
  createdAt: string
  updatedAt: string
}

export interface RecipeInput {
  yieldQuantity?: number
  notes?: string | null
  items: { ingredientId: string; quantity: number; wastePct?: number }[]
}
