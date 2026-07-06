"use client"

import { useQuery } from "@tanstack/react-query"
import { api, type Page } from "@/lib/api"
import { useActiveStoreId } from "@/features/auth"
import type { OrderListItem } from "@/features/orders/types"
import type { StockMovement } from "@/features/inventory/types"

/**
 * There is no aggregate `/dashboard` endpoint in this backend (API_SPEC.md
 * documents one, but it was never implemented — confirmed by its absence
 * under app/api/v1/stores/[storeId]/). Every figure below is derived from
 * the list endpoints that do exist, real data only, no mocks.
 */

function todayRange(): { dateFrom: string; dateTo: string } {
  const iso = new Date().toISOString().slice(0, 10)
  return { dateFrom: iso, dateTo: iso }
}

async function totalFor(path: string): Promise<number> {
  const page = await api.getPage<unknown>(path)
  return page.pagination.total
}

export interface DashboardOrdersToday {
  total: number
  grossRevenue: number
  averageTicket: number
  byStatus: Record<string, number>
}

/**
 * Fetches today's orders (up to 100 — a page large enough for realistic MVP
 * volume) to derive count, revenue and average ticket client-side. If a
 * store somehow exceeds 100 orders/day, `total` still comes from the
 * accurate `pagination.total`; revenue/average are computed over the
 * fetched page and become an approximation past that volume.
 */
export function useDashboardOrdersToday() {
  const storeId = useActiveStoreId()
  const { dateFrom, dateTo } = todayRange()

  return useQuery({
    queryKey: ["dashboard", storeId, "orders-today", dateFrom],
    enabled: Boolean(storeId),
    refetchInterval: 30_000,
    queryFn: async (): Promise<DashboardOrdersToday> => {
      const page = await api.getPage<OrderListItem>(
        `/stores/${storeId}/orders?limit=100&dateFrom=${dateFrom}&dateTo=${dateTo}&sort=created_at&order=desc`,
      )
      const nonCancelled = page.items.filter((order) => order.status !== "CANCELLED")
      const grossRevenue = nonCancelled.reduce((sum, order) => sum + order.grandTotal, 0)
      const byStatus: Record<string, number> = {}
      for (const order of page.items) {
        byStatus[order.status] = (byStatus[order.status] ?? 0) + 1
      }
      return {
        total: page.pagination.total,
        grossRevenue,
        averageTicket: nonCancelled.length > 0 ? Math.round(grossRevenue / nonCancelled.length) : 0,
        byStatus,
      }
    },
  })
}

export function useRecentOrders(limit = 5) {
  const storeId = useActiveStoreId()
  return useQuery({
    queryKey: ["dashboard", storeId, "recent-orders", limit],
    enabled: Boolean(storeId),
    refetchInterval: 30_000,
    queryFn: () => api.getPage<OrderListItem>(`/stores/${storeId}/orders?limit=${limit}&sort=created_at&order=desc`),
  })
}

export function useRecentStockMovements(limit = 5) {
  const storeId = useActiveStoreId()
  return useQuery({
    queryKey: ["dashboard", storeId, "recent-movements", limit],
    enabled: Boolean(storeId),
    refetchInterval: 30_000,
    queryFn: () => api.getPage<StockMovement>(`/stores/${storeId}/inventory/movements?perPage=${limit}`),
  })
}

export interface DashboardCounts {
  customers: number
  activeProducts: number
  activeDeliveries: number
  kitchenActive: number
  pendingPayments: number
}

/** Cheap `limit=1` reads for counts the app has no cheaper way to obtain. */
export function useDashboardCounts() {
  const storeId = useActiveStoreId()

  return useQuery({
    queryKey: ["dashboard", storeId, "counts"],
    enabled: Boolean(storeId),
    refetchInterval: 30_000,
    queryFn: async (): Promise<DashboardCounts> => {
      const [customers, activeProducts, activeDeliveries, kitchenActive, pendingPayments] = await Promise.all([
        totalFor(`/stores/${storeId}/customers?limit=1`),
        totalFor(`/stores/${storeId}/products?limit=1&status=ACTIVE`),
        totalFor(`/stores/${storeId}/deliveries?limit=1&status=AWAITING_PICKUP,DISPATCHED,IN_TRANSIT`),
        totalFor(`/stores/${storeId}/kitchen/tickets?limit=1&status=QUEUED,PREPARING`),
        totalFor(`/stores/${storeId}/payments?limit=1&status=PENDING`),
      ])
      return { customers, activeProducts, activeDeliveries, kitchenActive, pendingPayments }
    },
  })
}
