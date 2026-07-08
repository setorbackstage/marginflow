export interface MarketplaceIntegration {
  id: string
  storeId: string
  platform: string
  merchantId: string
  status: "ACTIVE" | "INACTIVE" | "ERROR"
  lastSyncAt: string | null
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}
