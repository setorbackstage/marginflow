export interface WebhookEndpoint {
  id: string
  storeId: string
  url: string
  /** Empty array or ["*"] means "all supported events". */
  events: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface WebhookCreateResult extends WebhookEndpoint {
  /** Returned only on creation — store it securely, it is never shown again. */
  secret: string
}
