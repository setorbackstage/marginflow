import "server-only"
import type { KitchenItem } from "@/generated/prisma/client"
import type { kitchenService } from "@/server/services"

type TicketWithItems = Awaited<ReturnType<typeof kitchenService.getByIdWithItems>>

export function toKitchenItemResponse(item: KitchenItem) {
  return {
    id: item.id,
    productName: item.productName,
    quantity: item.quantity,
    modifierSummary: item.modifierSummary,
    notes: item.notes,
    status: item.status,
  }
}

/** API_SPEC.md `GET /api/v1/stores/:storeId/kitchen/tickets(/:ticketId)` — shared ticket shape. */
export function toTicketResponse(ticket: TicketWithItems) {
  return {
    id: ticket.id,
    storeId: ticket.storeId,
    orderId: ticket.orderId,
    orderNumber: ticket.orderNumber,
    orderType: ticket.orderType,
    status: ticket.status,
    notes: ticket.notes,
    items: ticket.items.map(toKitchenItemResponse),
    queuedAt: ticket.queuedAt,
    startedAt: ticket.startedAt,
    readyAt: ticket.readyAt,
    cancelledAt: ticket.cancelledAt,
    minutesInQueue: Math.floor((Date.now() - ticket.queuedAt.getTime()) / 60000),
  }
}
