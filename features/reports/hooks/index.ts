"use client"

import { useQuery } from "@tanstack/react-query"
import { useActiveStoreId } from "@/features/auth"
import { reportsApi } from "../services"
import type { ReportsParams, ReportsSalesParams } from "../types"

const STALE = 60_000

export function useReportsOverview(params: ReportsParams) {
  const storeId = useActiveStoreId()
  return useQuery({
    queryKey:  ["reports", storeId, "overview", params.dateFrom, params.dateTo],
    enabled:   Boolean(storeId) && Boolean(params.dateFrom) && Boolean(params.dateTo),
    staleTime: STALE,
    queryFn:   () => reportsApi.overview(storeId, params),
  })
}

export function useReportsSales(params: ReportsSalesParams) {
  const storeId = useActiveStoreId()
  return useQuery({
    queryKey:  ["reports", storeId, "sales", params.dateFrom, params.dateTo, params.groupBy ?? "day"],
    enabled:   Boolean(storeId) && Boolean(params.dateFrom) && Boolean(params.dateTo),
    staleTime: STALE,
    queryFn:   () => reportsApi.sales(storeId, params),
  })
}

export function useReportsOrders(params: ReportsParams) {
  const storeId = useActiveStoreId()
  return useQuery({
    queryKey:  ["reports", storeId, "orders", params.dateFrom, params.dateTo],
    enabled:   Boolean(storeId) && Boolean(params.dateFrom) && Boolean(params.dateTo),
    staleTime: STALE,
    queryFn:   () => reportsApi.orders(storeId, params),
  })
}

export function useReportsProducts(params: ReportsParams & { page?: number }) {
  const storeId = useActiveStoreId()
  return useQuery({
    queryKey:  ["reports", storeId, "products", params.dateFrom, params.dateTo, params.page ?? 1],
    enabled:   Boolean(storeId) && Boolean(params.dateFrom) && Boolean(params.dateTo),
    staleTime: STALE,
    queryFn:   () => reportsApi.products(storeId, params),
  })
}

export function useReportsCustomers(params: ReportsParams) {
  const storeId = useActiveStoreId()
  return useQuery({
    queryKey:  ["reports", storeId, "customers", params.dateFrom, params.dateTo],
    enabled:   Boolean(storeId) && Boolean(params.dateFrom) && Boolean(params.dateTo),
    staleTime: STALE,
    queryFn:   () => reportsApi.customers(storeId, params),
  })
}

export function useReportsDelivery(params: ReportsParams) {
  const storeId = useActiveStoreId()
  return useQuery({
    queryKey:  ["reports", storeId, "delivery", params.dateFrom, params.dateTo],
    enabled:   Boolean(storeId) && Boolean(params.dateFrom) && Boolean(params.dateTo),
    staleTime: STALE,
    queryFn:   () => reportsApi.delivery(storeId, params),
  })
}
