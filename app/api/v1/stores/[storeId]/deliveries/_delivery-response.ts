import "server-only"
import type { Delivery } from "@/generated/prisma/client"

/** API_SPEC.md `GET /api/v1/stores/:storeId/deliveries(/:deliveryId)` — shared delivery shape. `orderNumber` is denormalized from the parent Order. */
export function toDeliveryResponse(delivery: Delivery, orderNumber: number) {
  return {
    id: delivery.id,
    orderId: delivery.orderId,
    orderNumber,
    status: delivery.status,
    courierName: delivery.courierName,
    courierPhone: delivery.courierPhone,
    courierType: delivery.courierType,
    platform: delivery.platform,
    platformDeliveryId: delivery.platformDeliveryId,
    deliveryAddress: delivery.deliveryAddress,
    estimatedMinutes: delivery.estimatedMinutes,
    failedReason: delivery.failedReason,
    dispatchedAt: delivery.dispatchedAt,
    deliveredAt: delivery.deliveredAt,
    failedAt: delivery.failedAt,
    createdAt: delivery.createdAt,
    updatedAt: delivery.updatedAt,
  }
}
