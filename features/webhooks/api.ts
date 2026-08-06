import { api } from "@/lib/api"
import type { WebhookEndpoint, WebhookCreateResult } from "./types"

export const webhooksApi = {
  list: (storeId: string) =>
    api.get<{ data: WebhookEndpoint[]; meta: { supportedEvents: string[] } }>(
      `/stores/${storeId}/webhooks`,
    ),

  create: (storeId: string, url: string, events: string[]) =>
    api.post<WebhookCreateResult>(`/stores/${storeId}/webhooks`, { url, events }),

  remove: (storeId: string, id: string) =>
    api.del<void>(`/stores/${storeId}/webhooks/${id}`),
}
