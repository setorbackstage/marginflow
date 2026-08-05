import "server-only"

// ── 99Food webhook envelope (CONFIRMED against rrozgrin/99food source) ──────
// The 99Food push is a wrapper, NOT a raw order object:
// {
//   "app_id": 123,
//   "app_shop_id": "xyz",
//   "type": "orderNew" | "orderFinish" | "orderCancel",
//   "timestamp": 1700000000,            // unix seconds
//   "data": {
//     "order_id": 987654,
//     "order_info": {
//       "order_id": 987654,
//       "order_items": [ { "name", "amount", "sku_price", "total_price", "remark", "app_item_id" } ],
//       "receive_address": { "name", "phone" },
//       "price": { "order_price", "real_price", "real_pay_price", "refund_price" },
//       "pay_type": 1,
//       "delivery_type": 1,
//       "create_time": <unix>, "pay_time": <unix>, ...
//     }
//   }
// }

export type NinetyNineFoodEventCode = "orderNew" | "orderFinish" | "orderCancel"

export interface NinetyNineFoodOrderItem {
  name?: string
  amount?: number
  sku_price?: number
  total_price?: number
  real_price?: number
  remark?: string
  app_item_id?: string
  app_external_id?: string
}

export interface NinetyNineFoodReceiveAddress {
  name?: string
  phone?: string
  /** other fields may exist; we only capture what we need */
}

export interface NinetyNineFoodPrice {
  order_price?: number
  real_price?: number
  real_pay_price?: number
  refund_price?: number
}

export interface NinetyNineFoodOrderInfo {
  order_id?: number | string
  order_items?: NinetyNineFoodOrderItem[]
  receive_address?: NinetyNineFoodReceiveAddress
  price?: NinetyNineFoodPrice
  pay_type?: number
  delivery_type?: number
  create_time?: number
  pay_time?: number
  remark?: string
  country?: string
  timezone?: string
}

export interface NinetyNineFoodWebhookEvent {
  app_id?: number | string
  app_shop_id?: string
  type?: NinetyNineFoodEventCode
  timestamp?: number
  data?: {
    order_id?: number | string
    order_info?: NinetyNineFoodOrderInfo
  }
}
