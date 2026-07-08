"use client"

import * as React from "react"
import { useActiveStoreId } from "@/features/auth"
import { useStore, useStoreSettings } from "@/features/stores"
import { ordersApi } from "@/features/orders/api"
import type { OrderDetail } from "@/features/orders/types"
import { buildReceiptHtml } from "@/components/print/receipt-html"

function printViaIframe(html: string) {
  const iframe = document.createElement("iframe")
  iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none"
  document.body.appendChild(iframe)
  const doc = iframe.contentDocument!
  doc.open()
  doc.write(html)
  doc.close()
  // Allow the iframe to paint before printing
  setTimeout(() => {
    iframe.contentWindow!.print()
    iframe.contentWindow!.addEventListener("afterprint", () => {
      document.body.removeChild(iframe)
    })
  }, 200)
}

/**
 * Returns helpers to print a thermal receipt.
 * - `printOrder(order)` — accepts a full OrderDetail already in memory.
 * - `printOrderById(orderId)` — fetches from the API then prints.
 */
export function usePrintOrder() {
  const storeId = useActiveStoreId()
  const settings = useStoreSettings()
  const store = useStore()

  const getFormat = () => settings.data?.receiptFormat ?? "THERMAL_80MM"
  const getStoreName = () => store.data?.name ?? ""

  const printOrder = React.useCallback(
    (order: OrderDetail) => {
      const html = buildReceiptHtml(order, getStoreName(), getFormat())
      printViaIframe(html)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settings.data, store.data],
  )

  const printOrderById = React.useCallback(
    async (orderId: string) => {
      const order = await ordersApi.get(storeId, orderId)
      const html = buildReceiptHtml(order, getStoreName(), getFormat())
      printViaIframe(html)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [storeId, settings.data, store.data],
  )

  return { printOrder, printOrderById }
}
