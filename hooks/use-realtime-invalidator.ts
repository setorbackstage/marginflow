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
 * This is the ONLY update mechanism. There is no polling fallback: the root cause
 * of "stale screens" was the Realtime client being null because
 * NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY were empty on Vercel.
 * Fixing those env vars (see .env.example) makes Realtime connect; no polling is
 * needed. If the client is null we log a warning so the missing env var is obvious
 * instead of silently degrading to a manual-refresh-only experience.
 */
export function useRealtimeInvalidator() {
  const storeId = useActiveStoreId()
  const queryClient = useQueryClient()

  React.useEffect(() => {
    if (!storeId) return

    const realtime = getRealtimeClient()
    if (!realtime) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          "[realtime] client unavailable — check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY",
        )
      }
      return
    }

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
  }, [storeId, queryClient])
}
