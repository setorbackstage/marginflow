"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { useActiveStoreId } from "@/features/auth"
import { ordersApi } from "./api"

function playAlertSound() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = "sine"
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.12)
    gain.gain.setValueAtTime(0.35, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.45)
    setTimeout(() => ctx.close(), 600)
  } catch {
    // AudioContext unavailable (SSR guard or browser policy)
  }
}

async function sendNativeNotification(title: string, body: string) {
  if (typeof Notification === "undefined") return
  // Request permission lazily — only when there is actually a new order to show.
  // This avoids the browser permission dialog appearing on every page load for
  // accounts that have no marketplace integration configured.
  if (Notification.permission === "default") {
    await Notification.requestPermission()
  }
  if (Notification.permission === "granted") {
    new Notification(title, {
      body,
      icon: "/icon-32x32.png",
      tag: "new-ifood-order",
      requireInteraction: true,
    })
  }
}

/**
 * Polls for incoming PENDING orders every 5 seconds (even in background tabs)
 * and fires a native OS notification + toast + sound when new marketplace
 * orders arrive. Runs at the app shell level.
 */
export function useNewOrderNotifier() {
  const storeId = useActiveStoreId()
  // null = first load (no alert); Set = known marketplace order IDs
  const knownIds = React.useRef<Set<string> | null>(null)

  const { data } = useQuery({
    queryKey: ["orders", storeId, "notifier-pending"],
    enabled: Boolean(storeId),
    queryFn: () => ordersApi.list(storeId, { status: "PENDING" }),
    // Poll every 5s when tab is visible; slow down to 30s in background
    // to avoid draining battery and flooding the server (would be 720 req/hour at 5s).
    // The webhook handles real-time delivery; background polling is just a safety net.
    refetchInterval: () =>
      typeof document !== "undefined" && document.visibilityState === "visible" ? 5_000 : 30_000,
    refetchIntervalInBackground: true,
  })

  React.useEffect(() => {
    if (!data) return

    const marketplaceOrders = data.items.filter((o) => o.channel === "MARKETPLACE")

    if (knownIds.current === null) {
      // First fetch — seed without alerting
      knownIds.current = new Set(marketplaceOrders.map((o) => o.id))
      return
    }

    const incoming = marketplaceOrders.filter((o) => !knownIds.current!.has(o.id))
    if (incoming.length > 0) {
      const title = incoming.length === 1 ? "Novo pedido iFood!" : `${incoming.length} novos pedidos iFood!`
      const body = incoming.length === 1 ? "Um novo pedido chegou pelo iFood." : `${incoming.length} pedidos chegaram pelo iFood.`

      // In-app toast + sound — shown when the tab is visible
      playAlertSound()
      toast.success(title, { description: body, duration: 8_000 })

      // Native OS notification — permission is requested lazily here, only when
      // a real order arrives. Fire-and-forget (no await) so toast shows immediately.
      void sendNativeNotification(title, body)

      incoming.forEach((o) => knownIds.current!.add(o.id))
    }

    marketplaceOrders.forEach((o) => knownIds.current!.add(o.id))
  }, [data])
}
