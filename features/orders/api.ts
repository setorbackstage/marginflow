import { api, type Page } from "@/lib/api"
import type { CreateOrderInput, OrderDetail, OrderItem, OrderListItem, OrderListParams, TimelineEntry, UpdateOrderItemInput } from "./types"

function qs(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value))
  }
  const s = search.toString()
  return s ? `?${s}` : ""
}

export const ordersApi = {
  list: (storeId: string, params: OrderListParams): Promise<Page<OrderListItem>> =>
    api.getPage<OrderListItem>(
      `/stores/${storeId}/orders${qs({ page: params.page ?? 1, limit: 20, status: params.status, type: params.type, search: params.search })}`,
    ),
  get: (storeId: string, orderId: string) => api.get<OrderDetail>(`/stores/${storeId}/orders/${orderId}`),
  create: (storeId: string, input: CreateOrderInput) => api.post<OrderDetail>(`/stores/${storeId}/orders`, input),
  update: (storeId: string, orderId: string, input: { notes?: string | null; tableNumber?: string | null }) =>
    api.patch<OrderDetail>(`/stores/${storeId}/orders/${orderId}`, input),
  updateStatus: (
    storeId: string,
    orderId: string,
    status: string,
    reason?: string,
    notes?: string,
    managerOverride?: { managerEmail: string; managerApprovalPassword: string },
  ) =>
    api.post<OrderDetail>(`/stores/${storeId}/orders/${orderId}/status`, {
      status,
      reason,
      notes,
      ...managerOverride,
    }),
  timeline: (storeId: string, orderId: string) => api.get<TimelineEntry[]>(`/stores/${storeId}/orders/${orderId}/timeline`),
  addItem: (storeId: string, orderId: string, input: { productId: string; quantity: number; selectedModifiers?: { modifierId: string; modifierGroupId: string }[]; notes?: string | null }) =>
    api.post<{ item: OrderItem }>(`/stores/${storeId}/orders/${orderId}/items`, input),
  updateItem: (storeId: string, orderId: string, itemId: string, input: UpdateOrderItemInput) =>
    api.patch<{ item: OrderItem }>(`/stores/${storeId}/orders/${orderId}/items/${itemId}`, input),
  removeItem: (storeId: string, orderId: string, itemId: string) => api.del(`/stores/${storeId}/orders/${orderId}/items/${itemId}`),
  initiatePayment: (storeId: string, orderId: string, input: { method: string; gateway?: string }) =>
    api.post(`/stores/${storeId}/orders/${orderId}/payment`, input),
}
