"use client"

import * as React from "react"
import { api } from "@/lib/api"
import { useActiveStoreId } from "@/features/auth"

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

type PushState = "unsupported" | "denied" | "granted" | "default" | "subscribing" | "unsubscribing"

/** Converts a base64url VAPID public key to the Uint8Array required by
 *  PushManager.subscribe(). */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = atob(base64)
  return Uint8Array.from(rawData, (c) => c.charCodeAt(0))
}

/**
 * Manages Web Push subscription state for the current user in the current store.
 *
 * Usage:
 *   const { state, subscriptionId, subscribe, unsubscribe } = usePushNotifications()
 */
export function usePushNotifications() {
  const storeId = useActiveStoreId()

  const isSupported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    Boolean(VAPID_PUBLIC_KEY)

  const [state, setState]             = React.useState<PushState>(() => {
    if (!isSupported) return "unsupported"
    return (Notification.permission as PushState) ?? "default"
  })
  const [subscriptionId, setSubId]    = React.useState<string | null>(null)
  const [swReg, setSwReg]             = React.useState<ServiceWorkerRegistration | null>(null)

  // Register service worker once
  React.useEffect(() => {
    if (!isSupported) return
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        setSwReg(reg)
        return reg.pushManager.getSubscription()
      })
      .then((existing) => {
        if (existing) {
          setState("granted")
          // Sync subscriptionId from server
          api.get<{ subscribed: boolean; count: number }>(
            `/stores/${storeId}/push-subscriptions`,
          ).catch(() => {})
        }
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSupported, storeId])

  const subscribe = React.useCallback(async () => {
    if (!isSupported || !swReg || !VAPID_PUBLIC_KEY) return
    setState("subscribing")
    try {
      const permission = await Notification.requestPermission()
      if (permission !== "granted") {
        setState("denied")
        return
      }
      const sub = await swReg.pushManager.subscribe({
        userVisibleOnly:     true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
      const json = sub.toJSON() as {
        endpoint: string
        keys?: { p256dh?: string; auth?: string }
      }
      const result = await api.post<{ id: string }>(
        `/stores/${storeId}/push-subscriptions`,
        {
          endpoint: json.endpoint,
          p256dh:   json.keys?.p256dh ?? "",
          auth:     json.keys?.auth   ?? "",
        },
      )
      setSubId(result.id)
      setState("granted")
    } catch {
      setState((Notification.permission as PushState) ?? "default")
    }
  }, [isSupported, swReg, storeId])

  const unsubscribe = React.useCallback(async () => {
    if (!isSupported || !swReg) return
    setState("unsubscribing")
    try {
      const sub = await swReg.pushManager.getSubscription()
      if (sub) await sub.unsubscribe()
      if (subscriptionId) {
        await api.del(`/stores/${storeId}/push-subscriptions/${subscriptionId}`).catch(() => {})
        setSubId(null)
      }
      setState("default")
    } catch {
      setState("granted")
    }
  }, [isSupported, swReg, storeId, subscriptionId])

  return { state, subscriptionId, subscribe, unsubscribe, isSupported }
}

/**
 * Calls POST /alerts/check every 5 minutes while the window is focused.
 * Smart alerts are created server-side (with push) for stale orders.
 */
export function useAlertCheck() {
  const storeId = useActiveStoreId()

  React.useEffect(() => {
    if (!storeId) return

    const run = () => {
      if (!document.hidden) {
        api.post(`/stores/${storeId}/alerts/check`, {}).catch(() => {})
      }
    }

    run() // immediate on mount
    const id = setInterval(run, 5 * 60 * 1000) // every 5 min
    return () => clearInterval(id)
  }, [storeId])
}
