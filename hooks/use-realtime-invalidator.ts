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
 *
 * Resilience: if the Realtime client is unavailable (missing env vars, WS
 * blocked, project Realtime disabled), we fall back to a periodic polling
 * invalidation so the UI still updates without a manual page refresh. This is
 * intentional redundancy, not a workaround — Realtime is the low-latency signal,
 * polling is the guaranteed one.
 */
const FALLBACK_POLL_MS = 15_000

export function useRealtimeInvalidator() {
  const storeId = useActiveStoreId()
  const queryClient = useQueryClient()

  React.useEffect(() => {
    if (!storeId) return

    const realtime = getRealtimeClient()

    // --- Realtime path ---
    if (realtime) {
      let channel = realtime.channel(`store-${storeId}`)
      for (const [table, getKeys] of Object.entries(TABLE_QUERY_KEYS)) {
        channel = channel.on(
          "postgres_changes" as const,
          { event: "*", schema: "public", table, filter: `store_id=eq.${storeId}` },
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
    }

    // --- Polling fallback (realtime unavailable) ---
    const allKeys: unknown[][] = []
    for (const getKeys of Object.values(TABLE_QUERY_KEYS)) {
      for (const key of getKeys(storeId)) allKeys.push(key as unknown[])
    }
    const timer = setInterval(() => {
      for (const key of allKeys) {
        queryClient.invalidateQueries({ queryKey: key })
      }
    }, FALLBACK_POLL_MS)
    return () => clearInterval(timer)
  }, [storeId, queryClient])
}
