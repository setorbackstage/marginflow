import { api, type Page } from "@/lib/api"
import type { PaymentDetail, PaymentListItem, PaymentListParams, RefundPaymentInput } from "./types"

function qs(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value))
  }
  const s = search.toString()
  return s ? `?${s}` : ""
}

export const paymentsApi = {
  list: (storeId: string, params: PaymentListParams): Promise<Page<PaymentListItem>> =>
    api.getPage<PaymentListItem>(`/stores/${storeId}/payments${qs({ page: params.page ?? 1, limit: 20, status: params.status })}`),
  get: (storeId: string, paymentId: string) => api.get<PaymentDetail>(`/stores/${storeId}/payments/${paymentId}`),
  confirm: (storeId: string, paymentId: string) => api.post<PaymentDetail>(`/stores/${storeId}/payments/${paymentId}/confirm`),
  refund: (storeId: string, paymentId: string, input: RefundPaymentInput) =>
    api.post<PaymentDetail>(`/stores/${storeId}/payments/${paymentId}/refund`, input),
}
