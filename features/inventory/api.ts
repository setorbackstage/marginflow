import { api, type Page } from "@/lib/api"
import type {
  Ingredient,
  IngredientDetail,
  IngredientInput,
  IngredientListParams,
  LowStockAlert,
  MovementInput,
  MovementListParams,
  Recipe,
  RecipeInput,
  StockMovement,
} from "./types"

function qs(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value))
  }
  const s = search.toString()
  return s ? `?${s}` : ""
}

export const ingredientsApi = {
  list: (storeId: string, params: IngredientListParams): Promise<Page<Ingredient>> =>
    api.getPage<Ingredient>(
      `/stores/${storeId}/inventory/ingredients${qs({
        page: params.page ?? 1,
        perPage: 20,
        search: params.search,
        status: params.status,
        lowStock: params.lowStock ? "true" : undefined,
      })}`,
    ),
  get: (storeId: string, ingredientId: string) =>
    api.get<IngredientDetail>(`/stores/${storeId}/inventory/ingredients/${ingredientId}`),
  create: (storeId: string, input: IngredientInput) =>
    api.post<Ingredient>(`/stores/${storeId}/inventory/ingredients`, input),
  update: (storeId: string, ingredientId: string, input: Partial<IngredientInput>) =>
    api.patch<Ingredient>(`/stores/${storeId}/inventory/ingredients/${ingredientId}`, input),
  remove: (storeId: string, ingredientId: string) =>
    api.del(`/stores/${storeId}/inventory/ingredients/${ingredientId}`),
}

export const movementsApi = {
  list: (storeId: string, params: MovementListParams): Promise<Page<StockMovement>> =>
    api.getPage<StockMovement>(
      `/stores/${storeId}/inventory/movements${qs({
        page: params.page ?? 1,
        perPage: 20,
        ingredientId: params.ingredientId,
        type: params.type,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
      })}`,
    ),
  create: (storeId: string, input: MovementInput) =>
    api.post<StockMovement & { currentStock: number }>(`/stores/${storeId}/inventory/movements`, input),
}

export const alertsApi = {
  list: (storeId: string) => api.get<LowStockAlert[]>(`/stores/${storeId}/inventory/alerts`),
}

export const recipesApi = {
  get: (storeId: string, productId: string) => api.get<Recipe>(`/stores/${storeId}/products/${productId}/recipe`),
  upsert: (storeId: string, productId: string, input: RecipeInput) =>
    api.put<Recipe>(`/stores/${storeId}/products/${productId}/recipe`, input),
  remove: (storeId: string, productId: string) => api.del(`/stores/${storeId}/products/${productId}/recipe`),
}
