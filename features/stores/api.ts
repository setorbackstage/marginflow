import { api } from "@/lib/api"
import type { Role, Store, StoreSettings, UpdateStoreInput, UpdateStoreSettingsInput } from "./types"

export const storesApi = {
  get: (storeId: string) => api.get<Store>(`/stores/${storeId}`),
  update: (storeId: string, input: UpdateStoreInput) => api.patch<Store>(`/stores/${storeId}`, input),
  getSettings: (storeId: string) => api.get<StoreSettings>(`/stores/${storeId}/settings`),
  updateSettings: (storeId: string, input: UpdateStoreSettingsInput) => api.patch<StoreSettings>(`/stores/${storeId}/settings`, input),
  listRoles: (storeId: string) => api.get<Role[]>(`/stores/${storeId}/roles`),
}
