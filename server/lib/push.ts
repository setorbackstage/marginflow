import "server-only"
import webpush from "web-push"
import { logger } from "./logger"

const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY
const VAPID_EMAIL   = process.env.VAPID_EMAIL ?? "mailto:admin@marginflow.app"

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE)
}

export interface PushPayload {
  title: string
  body:  string
  url?:  string
  tag?:  string
}

export interface PushSubscriptionKeys {
  endpoint: string
  p256dh:   string
  auth:     string
}

/** Returns false if VAPID keys are not configured (graceful no-op). */
export function isPushConfigured(): boolean {
  return Boolean(VAPID_PUBLIC && VAPID_PRIVATE)
}

/**
 * Sends a Web Push notification to a single subscription.
 * Returns `"expired"` if the endpoint responded 410 Gone (subscription must be deleted).
 * Returns `"ok"` on success, `"error"` on transient failure.
 */
export async function sendPushToSubscription(
  sub: PushSubscriptionKeys,
  payload: PushPayload,
): Promise<"ok" | "expired" | "error"> {
  if (!isPushConfigured()) return "ok"
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
    )
    return "ok"
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number }).statusCode
    if (statusCode === 410 || statusCode === 404) return "expired"
    logger.warn("push.send.failed", { endpoint: sub.endpoint, error: String(err) })
    return "error"
  }
}
