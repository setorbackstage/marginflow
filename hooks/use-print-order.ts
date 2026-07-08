"use client"

import * as React from "react"
import { useActiveStoreId } from "@/features/auth"
import { useStore, useStoreSettings } from "@/features/stores"
import { ordersApi } from "@/features/orders/api"
import type { OrderDetail } from "@/features/orders/types"
import { buildReceiptHtml, buildKitchenTicketHtml } from "@/components/print/receipt-html"

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
 * Returns helpers to print thermal receipts and kitchen tickets.
 *
 * - `printOrder(order, template?)` — prints from an OrderDetail already in memory.
 * - `printOrderById(orderId, template?)` — fetches then prints.
 * - `printOrderByIdAuto(orderId)` — prints whichever templates are enabled in settings.
 *
 * `template` defaults to `"CUSTOMER_RECEIPT"`.
 */
export function usePrintOrder() {
  const storeId = useActiveStoreId()
  const settings = useStoreSettings()
  const store = useStore()

  const getFormat = () => settings.data?.receiptFormat ?? "THERMAL_80MM"
  const getStoreName = () => store.data?.name ?? ""

  const printOrder = React.useCallback(
    (order: OrderDetail, template: "CUSTOMER_RECEIPT" | "KITCHEN_TICKET" = "CUSTOMER_RECEIPT") => {
      const fmt = getFormat()
      const html = template === "KITCHEN_TICKET"
        ? buildKitchenTicketHtml(order, getStoreName(), fmt)
        : buildReceiptHtml(order, getStoreName(), fmt)
      printViaIframe(html)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settings.data, store.data],
  )

  const printOrderById = React.useCallback(
    async (orderId: string, template: "CUSTOMER_RECEIPT" | "KITCHEN_TICKET" = "CUSTOMER_RECEIPT") => {
      const order = await ordersApi.get(storeId, orderId)
      const fmt = getFormat()
      const html = template === "KITCHEN_TICKET"
        ? buildKitchenTicketHtml(order, getStoreName(), fmt)
        : buildReceiptHtml(order, getStoreName(), fmt)
      printViaIframe(html)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [storeId, settings.data, store.data],
  )

  /** Prints all templates that are enabled in store settings. */
  const printOrderByIdAuto = React.useCallback(
    async (orderId: string) => {
      const order = await ordersApi.get(storeId, orderId)
      const fmt = getFormat()
      const storeName = getStoreName()
      if (settings.data?.printKitchenTicketOnConfirm) {
        printViaIframe(buildKitchenTicketHtml(order, storeName, fmt))
      }
      if (settings.data?.printReceiptOnConfirm) {
        // Small delay so both print dialogs don't stack on top of each other
        setTimeout(() => printViaIframe(buildReceiptHtml(order, storeName, fmt)), 400)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [storeId, settings.data, store.data],
  )

  return { printOrder, printOrderById, printOrderByIdAuto }
}
