import "server-only"
import type { OrderItem } from "@/generated/prisma/client"
import { prisma } from "@/server/db"
import { orderService, customerService } from "@/server/services"
import { NotFoundError } from "@/server/lib"

export type OrderWithDetails = NonNullable<Awaited<ReturnType<typeof orderService.findByIdWithDetails>>>

/** Shared item shape — used both inside `toOrderResponse` and by the order items endpoints. */
export function toOrderItemResponse(item: OrderItem) {
  return {
    id: item.id,
    productId: item.productId,
    productName: item.productName,
    productPrice: item.productPrice,
    quantity: item.quantity,
    selectedModifiers: item.selectedModifiers,
    unitTotal: item.unitTotal,
    subtotal: item.subtotal,
    notes: item.notes,
    status: item.status,
  }
}

/**
 * Fetches an order with its full detail graph and enforces Store Isolation
 * (API_SPEC.md) — a matching membership+permission at `storeId` does not by
 * itself imply access to an order that actually belongs to a different
 * store, so this always re-checks `order.storeId` after the fetch.
 */
export async function getOrderWithDetailsOrThrow(storeId: string, orderId: string): Promise<OrderWithDetails> {
  const order = await orderService.findByIdWithDetails(prisma, orderId)
  if (!order || order.storeId !== storeId) {
    throw new NotFoundError("ORDER_NOT_FOUND", "Order does not exist in this store.")
  }
  return order
}

/** API_SPEC.md `GET /api/v1/stores/:storeId/orders/:orderId` — response envelope shape, shared by every endpoint that returns "the updated order object" in this same shape. */
export async function toOrderResponse(order: OrderWithDetails) {
  const customer = order.customerId ? await customerService.getById(prisma, order.customerId) : null

  return {
    id: order.id,
    storeId: order.storeId,
    number: order.number,
    status: order.status,
    type: order.type,
    channel: order.channel,
    customerId: order.customerId,
    customer: customer ? { id: customer.id, name: customer.name, phone: customer.phone } : null,
    tableNumber: order.tableNumber,
    deliveryAddress: order.deliveryAddress,
    items: order.items.map(toOrderItemResponse),
    itemsTotal: order.itemsTotal,
    discountTotal: order.discountTotal,
    deliveryFee: order.deliveryFee,
    grandTotal: order.grandTotal,
    notes: order.notes,
    scheduledFor: order.scheduledFor,
    statusHistory: order.statusTransitions.map((transition) => ({
      status: transition.status,
      triggeredByUserId: transition.triggeredByUserId,
      notes: transition.notes,
      occurredAt: transition.occurredAt,
    })),
    kitchenTicketId: order.kitchenTicket?.id ?? null,
    paymentId: order.payment?.id ?? null,
    deliveryId: order.delivery?.id ?? null,
    cancelledReason: order.cancelledReason,
    cancelledByUserId: order.cancelledByUserId,
    confirmedAt: order.confirmedAt,
    readyAt: order.readyAt,
    deliveredAt: order.deliveredAt,
    cancelledAt: order.cancelledAt,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  }
}
