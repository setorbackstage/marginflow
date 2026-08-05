import "server-only"
import type { NinetyNineFoodOrderInfo } from "./events"
import type { MappedMarketplaceOrder } from "../ifood/mapper"

// ── Helpers ──────────────────────────────────────────────────────────────────

/** 99Food prices are integers (cents) in the webhook payload. */
function toCents(value: number | undefined | null): number {
  return typeof value === "number" && !Number.isNaN(value) ? Math.round(value) : 0
}

function mapDeliveryType(deliveryType: number | undefined): string {
  switch (deliveryType) {
    case 1:
      return "DELIVERY"
    case 2:
      return "TAKEAWAY"
    case 3:
      return "DINE_IN"
    default:
      return "DELIVERY"
  }
}

/**
 * Heuristic pay_type → MarginFlow method. The 99Food `pay_type` integer codes
 * are proprietary and NOT documented in the open API; this mapping is a
 * best-effort guess and should be validated against 99Food partner docs.
 * The authoritative "prepaid vs collect" signal is `pay_time` (present = paid).
 */
const PAY_TYPE_TO_METHOD: Record<number, string> = {
  1: "PIX",
  2: "CREDIT_CARD",
  3: "DEBIT_CARD",
  4: "CASH",
  5: "VOUCHER",
}

export interface MappedPayment {
  method: string
  isPrepaid: boolean
}

function mapPaymentInfo(info: NinetyNineFoodOrderInfo): MappedPayment | null {
  const isPrepaid = typeof info.pay_time === "number" && info.pay_time > 0
  if (isPrepaid) {
    const method = info.pay_type && PAY_TYPE_TO_METHOD[info.pay_type]
      ? PAY_TYPE_TO_METHOD[info.pay_type]
      : "ONLINE"
    return { method, isPrepaid: true }
  }
  // Not yet paid → collect on delivery/pickup
  const method = info.pay_type && PAY_TYPE_TO_METHOD[info.pay_type] ? PAY_TYPE_TO_METHOD[info.pay_type] : "CASH"
  return { method, isPrepaid: false }
}

// ── Mapper (from webhook `order_info`) ───────────────────────────────────────

/**
 * Maps a 99Food `order_info` payload (from the webhook `data.order_info`) into
 * the shared MarginFlow marketplace order shape. Reuses `MappedMarketplaceOrder`
 * so downstream ingestion is identical to iFood.
 *
 * CONFIRMED field names against rrozgrin/99food source:
 *   order_info.order_items[]: { name, amount, sku_price, total_price, remark }
 *   order_info.receive_address: { name, phone }
 *   order_info.price: { order_price, real_price, real_pay_price }
 *   order_info.pay_type (int), delivery_type (int), pay_time (unix|null)
 */
export function mapNinetyNineFoodOrderInfo(info: NinetyNineFoodOrderInfo): MappedMarketplaceOrder {
  const items = (info.order_items ?? []).map((item) => {
    const productPrice = toCents(item.sku_price)
    const quantity = typeof item.amount === "number" && item.amount > 0 ? item.amount : 1
    // total_price is the line subtotal in cents; fall back to unit*qty
    const subtotal = toCents(item.total_price) || productPrice * quantity

    return {
      productName: item.name ?? "Item",
      productPrice,
      quantity,
      selectedModifiers: [],
      unitTotal: productPrice,
      subtotal,
      notes: item.remark ?? null,
    }
  })

  const itemsTotal = items.reduce((sum, i) => sum + i.subtotal, 0)
  const grandTotal = toCents(info.price?.real_pay_price ?? info.price?.real_price ?? info.price?.order_price)
  const deliveryFee = 0 // 99Food does not separate delivery fee in this payload shape
  const discountTotal = Math.max(0, toCents(info.price?.order_price) - grandTotal)

  const addr = info.receive_address
  const deliveryAddress = addr
    ? {
        street: "",
        number: "S/N",
        complement: null,
        neighborhood: "",
        city: "",
        state: "",
        postalCode: "",
        country: info.country ?? "BR",
        latitude: null,
        longitude: null,
        reference: null,
      }
    : null

  const payment = mapPaymentInfo(info)

  return {
    // 99Food order_id is a numeric id; store as string externalId
    externalId: String(info.order_id ?? ""),
    type: mapDeliveryType(info.delivery_type),
    channel: "MARKETPLACE",
    customerName: addr?.name ?? null,
    customerPhone: addr?.phone ?? null,
    // CPF/document is OPTIONAL — 99Food does not send it in the order payload.
    customerDocument: null,
    deliveryAddress,
    itemsTotal,
    discountTotal,
    deliveryFee,
    grandTotal,
    notes: info.remark ?? null,
    scheduledFor: null,
    items,
    deliveredBy: info.delivery_type === 1 ? "99FOOD" : "MERCHANT",
    payment,
  }
}
