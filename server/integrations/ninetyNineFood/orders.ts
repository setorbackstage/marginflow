import "server-only"
import { ninetyNineFoodFetch } from "./client"
import type { NinetyNineFoodOrderInfo } from "./events"

// ── Order lifecycle actions ──────────────────────────────────────────────────
// 99Food does not document a public order-action REST surface in the open API
// the way iFood does. These are best-effort helpers following the iFood-style
// convention; adjust endpoints once the 99Food partner docs confirm them.

export function confirmNinetyNineFoodOrder(
  accessToken: string,
  orderId: string | number,
): Promise<void> {
  return ninetyNineFoodFetch(`/v1/order/${orderId}/confirm`, accessToken, { method: "POST" })
}

export function markNinetyNineFoodOrderReadyToPickup(
  accessToken: string,
  orderId: string | number,
): Promise<void> {
  return ninetyNineFoodFetch(`/v1/order/${orderId}/readyToPickup`, accessToken, { method: "POST" })
}

export function dispatchNinetyNineFoodOrder(
  accessToken: string,
  orderId: string | number,
  deliveredBy: "MERCHANT" | "99FOOD" = "MERCHANT",
): Promise<void> {
  return ninetyNineFoodFetch(`/v1/order/${orderId}/dispatch`, accessToken, {
    method: "POST",
    body: JSON.stringify({ deliveredBy }),
  })
}

/**
 * Maps a MarginFlow free-text cancellation reason to a 99Food reason code.
 * 99Food cancellation codes are merchant-side; default to MERCHANT_CANCEL.
 */
export function mapNinetyNineFoodCancellationReason(reason: string | null | undefined): string {
  if (!reason) return "MERCHANT_CANCEL"
  const r = reason.toLowerCase()
  if (r.includes("duplicad") || r.includes("duplicate")) return "DUPLICATE"
  if (r.includes("entrega") || r.includes("delivery") || r.includes("motoboy")) return "DELIVERY_FAILED"
  if (r.includes("cliente") || r.includes("customer") || r.includes("desistiu")) return "CUSTOMER_CANCEL"
  return "MERCHANT_CANCEL"
}

export function requestNinetyNineFoodCancellation(
  accessToken: string,
  orderId: string | number,
  reason = "MERCHANT_CANCEL",
): Promise<void> {
  return ninetyNineFoodFetch(`/v1/order/${orderId}/requestCancellation`, accessToken, {
    method: "POST",
    body: JSON.stringify({ reason }),
  })
}

// Optional: fetch a single order by id (unverified endpoint — used for re-sync).
export function fetchNinetyNineFoodOrder(
  accessToken: string,
  orderId: string | number,
): Promise<NinetyNineFoodOrderInfo> {
  return ninetyNineFoodFetch<NinetyNineFoodOrderInfo>(`/v1/order/${orderId}`, accessToken)
}
