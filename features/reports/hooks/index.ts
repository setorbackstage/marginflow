"use client"

import { useQuery } from "@tanstack/react-query"
import { useActiveStoreId } from "@/features/auth"
import { reportsApi } from "../services"
import type { ReportsParams } from "../types"

export function useReportsOverview(params: ReportsParams) {
  const storeId = useActiveStoreId()
  return useQuery({
    queryKey:  ["reports", storeId, "overview", params.dateFrom, params.dateTo],
    enabled:   Boolean(storeId) && Boolean(params.dateFrom) && Boolean(params.dateTo),
    staleTime: 60_000,
    queryFn:   () => reportsApi.overview(storeId, params),
  })
}
