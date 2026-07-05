"use client"

import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { useActiveStoreId } from "@/features/auth"

async function totalFor(path: string): Promise<number> {
  const page = await api.getPage<unknown>(path)
  return page.pagination.total
}

export interface DashboardCounts {
  orders: number
  deliveries: number
  kitchen: number
}

/**
 * Live operational counts for the active store, read from the list endpoints'
 * pagination totals (limit=1 keeps the payload tiny). All real data — no mocks.
 */
export function useDashboardCounts() {
  const storeId = useActiveStoreId()

  return useQuery({
    queryKey: ["dashboard", storeId, "counts"],
    enabled: Boolean(storeId),
    queryFn: async (): Promise<DashboardCounts> => {
      const [orders, deliveries, kitchen] = await Promise.all([
        totalFor(`/stores/${storeId}/orders?limit=1`),
        totalFor(`/stores/${storeId}/deliveries?limit=1`),
        totalFor(`/stores/${storeId}/kitchen/tickets?limit=1`),
      ])
      return { orders, deliveries, kitchen }
    },
  })
}
