import { api } from "@/lib/api"
import type { ReportsOverview, ReportsParams } from "../types"

function qs(params: ReportsParams): string {
  return `?dateFrom=${params.dateFrom}&dateTo=${params.dateTo}`
}

export const reportsApi = {
  overview: (storeId: string, params: ReportsParams): Promise<ReportsOverview> =>
    api.get<ReportsOverview>(`/stores/${storeId}/reports/overview${qs(params)}`),
}
