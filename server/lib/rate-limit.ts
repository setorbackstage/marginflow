/**
 * In-process rate limiter using a sliding-window counter per key.
 * Suitable for single-instance and low-traffic scenarios.
 * Replace with Redis-backed solution for multi-instance deployments.
 */

import type { NextRequest } from "next/server"

interface Entry {
  count: number
  resetAt: number
}

const store = new Map<string, Entry>()

// Cleanup stale entries every 10 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key)
  }
}, 10 * 60 * 1000).unref()

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

/**
 * @param key      Unique key (e.g. "login:1.2.3.4")
 * @param limit    Max requests allowed in the window
 * @param windowMs Window duration in milliseconds
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs }
  }

  entry.count++
  const remaining = Math.max(0, limit - entry.count)
  return { allowed: entry.count <= limit, remaining, resetAt: entry.resetAt }
}

export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  )
}
