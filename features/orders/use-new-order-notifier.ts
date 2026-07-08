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

/**
 * Polls for incoming PENDING orders every 5 seconds and fires a toast +
 * sound alert when new marketplace orders arrive. Runs at the app shell
 * level so notifications work regardless of which page is active.
 */
export function useNewOrderNotifier() {
  const storeId = useActiveStoreId()
  // null = first load (no alert); Set = known marketplace order IDs
  const knownIds = React.useRef<Set<string> | null>(null)

  const { data } = useQuery({
    queryKey: ["orders", storeId, "notifier-pending"],
    enabled: Boolean(storeId),
    queryFn: () => ordersApi.list(storeId, { status: "PENDING" }),
    refetchInterval: 5_000,
    refetchIntervalInBackground: false,
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
      playAlertSound()
      toast.success(
        incoming.length === 1
          ? "Novo pedido iFood chegou!"
          : `${incoming.length} novos pedidos iFood chegaram!`,
        { duration: 8_000 },
      )
      incoming.forEach((o) => knownIds.current!.add(o.id))
    }

    marketplaceOrders.forEach((o) => knownIds.current!.add(o.id))
  }, [data])
}
