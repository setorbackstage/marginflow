"use client"

import * as React from "react"
import type { CartLine, CartLineSelection } from "./types"

/**
 * Sprint 2 "Carrinho" — local-only, no checkout (the sprint explicitly
 * defers payment/ordering to a future sprint). Persisted to localStorage
 * per store slug so a reload or a re-scanned QR code doesn't lose it.
 */
export function useCart(storeSlug: string) {
  const storageKey = `marginflow-cart:${storeSlug}`
  const [lines, setLines] = React.useState<CartLine[]>([])
  const [hydrated, setHydrated] = React.useState(false)

  React.useEffect(() => {
    // Intentional setState-in-effect: the cart must render empty on the
    // server (and on the client's first paint, to match) and only then
    // hydrate from localStorage — reading synchronously during render would
    // desync the client's first paint from the server-rendered HTML.
    try {
      const raw = localStorage.getItem(storageKey)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setLines(JSON.parse(raw))
    } catch {
      // Corrupt/unavailable storage — start empty rather than crash the page.
    }
    setHydrated(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey])

  React.useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(storageKey, JSON.stringify(lines))
  }, [lines, hydrated, storageKey])

  const addLine = (input: {
    productId: string
    productName: string
    unitPrice: number
    quantity: number
    selections: CartLineSelection[]
    notes: string | null
  }) => {
    setLines((prev) => [...prev, { ...input, lineId: crypto.randomUUID() }])
  }

  const removeLine = (lineId: string) =>
    setLines((prev) => prev.filter((l) => l.lineId !== lineId))

  const setQuantity = (lineId: string, quantity: number) => {
    if (quantity <= 0) return removeLine(lineId)
    setLines((prev) =>
      prev.map((l) => (l.lineId === lineId ? { ...l, quantity } : l)),
    )
  }

  const clear = () => setLines([])

  const lineTotal = (line: CartLine) =>
    (line.unitPrice +
      line.selections.reduce((s, sel) => s + sel.priceAdjustment, 0)) *
    line.quantity
  const subtotal = lines.reduce((sum, line) => sum + lineTotal(line), 0)
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0)

  return {
    lines,
    addLine,
    removeLine,
    setQuantity,
    clear,
    subtotal,
    itemCount,
    lineTotal,
  }
}
