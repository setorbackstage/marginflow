"use client"

import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import { getRealtimeClient } from "@/lib/supabase-realtime"

/**
 * Subscribes to Supabase Realtime changes on `table` filtered by storeId,
 * then invalidates the given React Query keys.
 *
 * Pattern: signal-only — no data travels through Realtime.
 * Data is always fetched via the authenticated API.
 *
 * Uses the shared RealtimeClient singleton (one WebSocket per browser session).
 * The app-shell-level `useRealtimeInvalidator` covers all tables globally;
 * this hook is for pages that want an explicit, self-contained subscription.
 */
export function useRealtimeSync(opts: {
  table: string
  storeId: string | undefined
  queryKeys: unknown[][]
  event?: "INSERT" | "UPDATE" | "DELETE" | "*"
}) {
  const { table, storeId, queryKeys, event = "*" } = opts
  const queryClient = useQueryClient()

  React.useEffect(() => {
    if (!storeId || typeof window === "undefined") return

    const realtime = getRealtimeClient()
    if (!realtime) return

    const channel = realtime
      .channel(`sync:${table}:${storeId}`)
      .on(
        "postgres_changes" as const,
        { event, schema: "public", table, filter: `store_id=eq.${storeId}` },
        () => {
          for (const key of queryKeys) {
            queryClient.invalidateQueries({ queryKey: key })
          }
        },
      )
      .subscribe()

    return () => {
      void realtime.removeChannel(channel)
    }
  // queryKeys is intentionally excluded: callers should pass stable refs to avoid
  // thrashing the WebSocket on every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, storeId, event, queryClient])
}
