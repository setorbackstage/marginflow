import "server-only"
import { ifoodFetch } from "./client"

export interface IfoodEvent {
  id: string
  /** Short code, e.g. "PLC", "CFM", "CAN", "KEEPALIVE" */
  code: string
  /** Long code, e.g. "PLACED", "CONFIRMED", "CANCELLED", "KEEPALIVE" */
  fullCode: string
  orderId?: string
  merchantId?: string
  /** Present on KEEPALIVE events only */
  merchantIds?: string[]
  createdAt?: string
  salesChannel?: string
}

/**
 * Polls for pending events for the given merchant IDs.
 * Returns an empty array when there are no events (iFood returns 204).
 * Caller MUST acknowledge returned events immediately after persisting them.
 */
export async function pollIfoodEvents(accessToken: string, merchantIds: string[]): Promise<IfoodEvent[]> {
  if (merchantIds.length === 0) return []

  const result = await ifoodFetch<IfoodEvent[]>("/events/v1.0/events:polling", accessToken, {
    method: "GET",
    headers: { "x-polling-merchants": merchantIds.join(",") },
  })

  // 204 returns {} from ifoodFetch; treat as empty
  return Array.isArray(result) ? result : []
}

/**
 * Acknowledges processed events so iFood stops redelivering them.
 * Must be called after persisting events — if persistence fails, skip acknowledgment.
 */
export async function acknowledgeIfoodEvents(accessToken: string, eventIds: string[]): Promise<void> {
  if (eventIds.length === 0) return

  await ifoodFetch("/events/v1.0/events/acknowledgment", accessToken, {
    method: "POST",
    body: JSON.stringify(eventIds.map((id) => ({ id }))),
  })
}
