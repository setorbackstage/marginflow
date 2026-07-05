export type DeliveryStatus = "AWAITING_PICKUP" | "DISPATCHED" | "IN_TRANSIT" | "DELIVERED" | "FAILED" | "RETURNED"
export type CourierType = "INTERNAL" | "PLATFORM"
export type Platform = "IFOOD" | "RAPPI" | "UBER_EATS" | "LOGGI" | "OTHER"

export interface DeliveryAddress {
  street: string
  number: string
  complement: string | null
  neighborhood: string
  city: string
  state: string
  postalCode: string
  country: string
}

export interface Delivery {
  id: string
  orderId: string
  orderNumber: number
  status: DeliveryStatus
  courierName: string | null
  courierPhone: string | null
  courierType: CourierType | null
  platform: Platform | null
  platformDeliveryId: string | null
  deliveryAddress: DeliveryAddress
  estimatedMinutes: number | null
  failedReason: string | null
  dispatchedAt: string | null
  deliveredAt: string | null
  failedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface AssignCourierInput {
  courierName: string
  courierPhone?: string | null
  courierType: CourierType
  platform?: Platform | null
  estimatedMinutes?: number | null
}
