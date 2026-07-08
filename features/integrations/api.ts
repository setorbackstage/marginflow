import { api } from "@/lib/api"
import type { MarketplaceIntegration } from "./types"

export const integrationsApi = {
  list: (storeId: string) =>
    api.get<MarketplaceIntegration[]>(`/stores/${storeId}/integrations`),

  connect: (storeId: string, platform: string, merchantId: string) =>
    api.post<MarketplaceIntegration>(`/stores/${storeId}/integrations`, { platform, merchantId }),

  disconnect: (storeId: string, platform: string) =>
    api.del<void>(`/stores/${storeId}/integrations/${platform}`),

  setPaused: (storeId: string, platform: string, paused: boolean) =>
    api.patch<{ isPaused: boolean }>(`/stores/${storeId}/integrations/${platform}`, { paused }),
}
