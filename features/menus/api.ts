import { api } from "@/lib/api"
import type { CreateMenuInput, MenuDetail, MenuListItem, MenuSectionInput, UpdateMenuInput } from "./types"

export const menusApi = {
  list: (storeId: string) => api.get<MenuListItem[]>(`/stores/${storeId}/menus`),
  get: (storeId: string, menuId: string) => api.get<MenuDetail>(`/stores/${storeId}/menus/${menuId}`),
  create: (storeId: string, input: CreateMenuInput) => api.post<MenuDetail>(`/stores/${storeId}/menus`, input),
  update: (storeId: string, menuId: string, input: UpdateMenuInput) => api.patch<MenuDetail>(`/stores/${storeId}/menus/${menuId}`, input),
  remove: (storeId: string, menuId: string) => api.del(`/stores/${storeId}/menus/${menuId}`),
  publish: (storeId: string, menuId: string) => api.post<MenuDetail>(`/stores/${storeId}/menus/${menuId}/publish`),
  unpublish: (storeId: string, menuId: string) => api.post<MenuDetail>(`/stores/${storeId}/menus/${menuId}/unpublish`),
  replaceSections: (storeId: string, menuId: string, sections: MenuSectionInput[]) =>
    api.put<MenuDetail>(`/stores/${storeId}/menus/${menuId}/sections`, { sections }),
}
