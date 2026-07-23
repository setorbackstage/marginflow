import { api, type Page } from "@/lib/api"
import type {
  ReportsOverview,
  ReportsParams,
  ReportsSales,
  ReportsSalesParams,
  ReportsOrders,
  ProductReportItem,
  ReportsCustomers,
  ReportsDelivery,
} from "../types"

function qs(params: ReportsParams): string {
  return `?dateFrom=${params.dateFrom}&dateTo=${params.dateTo}`
}

export const reportsApi = {
  overview: (storeId: string, params: ReportsParams): Promise<ReportsOverview> =>
    api.get<ReportsOverview>(`/stores/${storeId}/reports/overview${qs(params)}`),

  sales: (storeId: string, params: ReportsSalesParams): Promise<ReportsSales> => {
    const base = qs(params)
    const groupBy = params.groupBy ? `&groupBy=${params.groupBy}` : ""
    return api.get<ReportsSales>(`/stores/${storeId}/reports/sales${base}${groupBy}`)
  },

  orders: (storeId: string, params: ReportsParams): Promise<ReportsOrders> =>
    api.get<ReportsOrders>(`/stores/${storeId}/reports/orders${qs(params)}`),

  products: (storeId: string, params: ReportsParams & { page?: number; limit?: number }): Promise<Page<ProductReportItem>> => {
    const base = qs(params)
    const extra = `&page=${params.page ?? 1}&limit=${params.limit ?? 20}`
    return api.getPage<ProductReportItem>(`/stores/${storeId}/reports/products${base}${extra}`)
  },

  customers: (storeId: string, params: ReportsParams): Promise<ReportsCustomers> =>
    api.get<ReportsCustomers>(`/stores/${storeId}/reports/customers${qs(params)}`),

  delivery: (storeId: string, params: ReportsParams): Promise<ReportsDelivery> =>
    api.get<ReportsDelivery>(`/stores/${storeId}/reports/delivery${qs(params)}`),
}
