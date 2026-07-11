"use client"

import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useActiveStoreId } from "@/features/auth"
import { getRealtimeClient } from "@/lib/supabase-realtime"

/**
 * Maps each Postgres table to the TanStack Query key prefixes that depend on it.
 * When Supabase Realtime fires a change event on a table, we invalidate those
 * queries — TanStack immediately refetches from our authenticated API.
 *
 * We intentionally do NOT read data from the realtime payload: security-sensitive
 * data stays behind our JWT-authenticated API routes. Realtime is only the signal.
 */
const TABLE_QUERY_KEYS: Record<string, (storeId: string) => readonly unknown[][]> = {
  orders: (storeId) => [
    ["orders", storeId],
    ["dashboard", storeId],
  ],
  kitchen_tickets: (storeId) => [
    ["kitchen", storeId],
  ],
  payments: (storeId) => [
    ["payments", storeId],
    ["dashboard", storeId],
  ],
  notifications: (storeId) => [
    ["notifications", storeId],
  ],
  deliveries: (storeId) => [
    ["delivery", storeId],
  ],
  stock_movements: (storeId) => [
    ["inventory", storeId],
    ["dashboard", storeId],
  ],
}

/**
 * Subscribes to Supabase Realtime postgres_changes for the active store and
 * invalidates TanStack Query caches on any INSERT/UPDATE/DELETE.
 *
 * Mount once at the app shell level — never in individual pages.
 * All polling intervals become safety-net fallbacks once this is active.
 */
export function useRealtimeInvalidator() {
  const storeId = useActiveStoreId()
  const queryClient = useQueryClient()

  React.useEffect(() => {
    if (!storeId) return

    const realtime = getRealtimeClient()
    if (!realtime) return

    // One channel per store — all table subscriptions multiplexed over one WS.
    let channel = realtime.channel(`store-${storeId}`)

    for (const [table, getKeys] of Object.entries(TABLE_QUERY_KEYS)) {
      channel = channel.on(
        "postgres_changes" as const,
        {
          event: "*",
          schema: "public",
          table,
          filter: `store_id=eq.${storeId}`,
        },
        () => {
          for (const key of getKeys(storeId)) {
            queryClient.invalidateQueries({ queryKey: key })
          }
        },
      )
    }

    channel.subscribe()

    return () => {
      realtime.removeChannel(channel)
    }
  }, [storeId, queryClient])
}
