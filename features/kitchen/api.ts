import { api } from "@/lib/api"
import type { KitchenItem, KitchenTicket } from "./types"

export const kitchenApi = {
  list: (storeId: string) => api.get<KitchenTicket[]>(`/stores/${storeId}/kitchen/tickets?status=QUEUED,PREPARING,READY`),
  get: (storeId: string, ticketId: string) => api.get<KitchenTicket>(`/stores/${storeId}/kitchen/tickets/${ticketId}`),
  updateTicketStatus: (storeId: string, ticketId: string, status: string) =>
    api.post<KitchenTicket>(`/stores/${storeId}/kitchen/tickets/${ticketId}/status`, { status }),
  updateItemStatus: (storeId: string, itemId: string, status: string) =>
    api.patch<KitchenItem>(`/stores/${storeId}/kitchen/items/${itemId}/status`, { status }),
}
