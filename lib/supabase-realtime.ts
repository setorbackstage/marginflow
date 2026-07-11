import { RealtimeClient } from "@supabase/realtime-js"

// Singleton — one WebSocket per browser session, shared by all subscribers.
let _client: RealtimeClient | null = null

/**
 * Returns the shared Supabase Realtime client.
 * Returns null on the server (SSR) or when env vars are missing.
 *
 * The client connects once and stays connected for the lifetime of the page.
 * Channel subscriptions are managed individually via `useRealtimeInvalidator`.
 */
export function getRealtimeClient(): RealtimeClient | null {
  if (typeof window === "undefined") return null
  if (_client) return _client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null

  _client = new RealtimeClient(`${url}/realtime/v1`, {
    params: { apikey: key },
    heartbeatIntervalMs: 30_000,
  })
  _client.connect()

  return _client
}
