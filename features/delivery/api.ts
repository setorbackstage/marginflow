import { api, type Page } from "@/lib/api"
import type { AssignCourierInput, Delivery } from "./types"

const BOARD_STATUSES = "AWAITING_PICKUP,DISPATCHED,IN_TRANSIT,DELIVERED,FAILED"

export const deliveryApi = {
  list: (storeId: string): Promise<Page<Delivery>> => api.getPage<Delivery>(`/stores/${storeId}/deliveries?limit=100&status=${BOARD_STATUSES}`),
  get: (storeId: string, deliveryId: string) => api.get<Delivery>(`/stores/${storeId}/deliveries/${deliveryId}`),
  assignCourier: (storeId: string, deliveryId: string, input: AssignCourierInput) =>
    api.patch<Delivery>(`/stores/${storeId}/deliveries/${deliveryId}`, input),
  updateStatus: (storeId: string, deliveryId: string, status: string, reason?: string) =>
    api.post<Delivery>(`/stores/${storeId}/deliveries/${deliveryId}/status`, { status, reason }),
}
