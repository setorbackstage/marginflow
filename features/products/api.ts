import { api, type Page } from "@/lib/api"
import type {
  Category,
  CategoryInput,
  ProductDetail,
  ProductInput,
  ProductListItem,
  ProductListParams,
  ModifierGroup,
  ModifierGroupInput,
  Modifier,
  ModifierInput,
} from "./types"

function qs(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value))
  }
  const s = search.toString()
  return s ? `?${s}` : ""
}

export const categoriesApi = {
  list: (storeId: string, search?: string) => api.get<Category[]>(`/stores/${storeId}/categories${qs({ search })}`),
  create: (storeId: string, input: CategoryInput) => api.post<Category>(`/stores/${storeId}/categories`, input),
  update: (storeId: string, categoryId: string, input: Partial<CategoryInput>) =>
    api.patch<Category>(`/stores/${storeId}/categories/${categoryId}`, input),
  remove: (storeId: string, categoryId: string) => api.del(`/stores/${storeId}/categories/${categoryId}`),
}

export const productsApi = {
  list: (storeId: string, params: ProductListParams): Promise<Page<ProductListItem>> =>
    api.getPage<ProductListItem>(
      `/stores/${storeId}/products${qs({ page: params.page ?? 1, limit: 20, categoryId: params.categoryId, status: params.status, search: params.search })}`,
    ),
  get: (storeId: string, productId: string) => api.get<ProductDetail>(`/stores/${storeId}/products/${productId}`),
  create: (storeId: string, input: ProductInput) => api.post<ProductDetail>(`/stores/${storeId}/products`, input),
  update: (storeId: string, productId: string, input: Partial<ProductInput>) =>
    api.patch<ProductDetail>(`/stores/${storeId}/products/${productId}`, input),
  remove: (storeId: string, productId: string) => api.del(`/stores/${storeId}/products/${productId}`),
}

export const modifierGroupsApi = {
  list: (storeId: string, productId: string) => api.get<ModifierGroup[]>(`/stores/${storeId}/products/${productId}/modifier-groups`),
  create: (storeId: string, productId: string, input: ModifierGroupInput) =>
    api.post<ModifierGroup>(`/stores/${storeId}/products/${productId}/modifier-groups`, input),
  update: (storeId: string, productId: string, groupId: string, input: Partial<ModifierGroupInput>) =>
    api.patch<ModifierGroup>(`/stores/${storeId}/products/${productId}/modifier-groups/${groupId}`, input),
  remove: (storeId: string, productId: string, groupId: string) =>
    api.del(`/stores/${storeId}/products/${productId}/modifier-groups/${groupId}`),
}

export const modifiersApi = {
  create: (storeId: string, productId: string, groupId: string, input: ModifierInput) =>
    api.post<Modifier>(`/stores/${storeId}/products/${productId}/modifier-groups/${groupId}/modifiers`, input),
  update: (storeId: string, productId: string, groupId: string, modifierId: string, input: Partial<ModifierInput>) =>
    api.patch<Modifier>(`/stores/${storeId}/products/${productId}/modifier-groups/${groupId}/modifiers/${modifierId}`, input),
  remove: (storeId: string, productId: string, groupId: string, modifierId: string) =>
    api.del(`/stores/${storeId}/products/${productId}/modifier-groups/${groupId}/modifiers/${modifierId}`),
}
