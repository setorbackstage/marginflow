import "server-only"
import type { DbClient } from "../db"
import type { KitchenItem, KitchenTicket } from "../../generated/prisma/client"
import { kitchenTicketRepository, kitchenItemRepository, orderRepository } from "../repositories"
import { BadRequestError, ConflictError, NotFoundError } from "../lib/errors"
import { eventBus, createEvent } from "../lib/events"
import type { DeliveryAddressSnapshotPayload } from "../lib/events/types"

const TICKET_TRANSITIONS: Record<string, string[]> = {
  QUEUED: ["PREPARING"],
  PREPARING: ["READY"],
}

/** Store Isolation (API_SPEC.md): masks a ticket belonging to another store as not-found. */
async function getTicketOrThrow(db: DbClient, storeId: string, id: string): Promise<KitchenTicket> {
  const ticket = await kitchenTicketRepository.findById(db, id)
  if (!ticket || ticket.storeId !== storeId) throw new NotFoundError("TICKET_NOT_FOUND", "Kitchen ticket does not exist.")
  return ticket
}

async function getTicketWithItemsOrThrow(db: DbClient, storeId: string, id: string) {
  const ticket = await kitchenTicketRepository.findByIdWithItems(db, id)
  if (!ticket || ticket.storeId !== storeId) throw new NotFoundError("TICKET_NOT_FOUND", "Kitchen ticket does not exist.")
  return ticket
}

export const kitchenService = {
  getById: getTicketOrThrow,
  getByIdWithItems: getTicketWithItemsOrThrow,
  listByStore: kitchenTicketRepository.findManyByStore,

  /**
   * `POST /kitchen/tickets/:ticketId/status`. QUEUED→PREPARING and
   * PREPARING→READY are the only transitions Kitchen owns — see the
   * ownership note on `POST /orders/:orderId/status`.
   */
  async updateTicketStatus(db: DbClient, storeId: string, ticketId: string, target: string): Promise<KitchenTicket> {
    const ticket = await getTicketOrThrow(db, storeId, ticketId)
    if (ticket.status === "CANCELLED") {
      throw new ConflictError("TICKET_CANCELLED", "Ticket has been cancelled (parent order was cancelled).")
    }

    const allowed = TICKET_TRANSITIONS[ticket.status] ?? []
    if (!allowed.includes(target)) {
      throw new BadRequestError("INVALID_TRANSITION", "Transition not allowed.")
    }

    const now = new Date()
    const previousStatus = ticket.status

    if (target === "PREPARING") {
      const updated = await kitchenTicketRepository.update(db, ticketId, { status: "PREPARING", startedAt: now })
      await eventBus.publish(
        createEvent("kitchen_ticket.status_changed", storeId, null, {
          ticketId,
          orderId: ticket.orderId,
          previousStatus,
          newStatus: "PREPARING",
          occurredAt: now.toISOString(),
        }),
        db,
      )
      return updated
    }

    // target === "READY"
    const updated = await kitchenTicketRepository.update(db, ticketId, { status: "READY", readyAt: now })
    await eventBus.publish(
      createEvent("kitchen_ticket.status_changed", storeId, null, {
        ticketId,
        orderId: ticket.orderId,
        previousStatus,
        newStatus: "READY",
        occurredAt: now.toISOString(),
      }),
      db,
    )

    let deliveryAddressSnapshot: DeliveryAddressSnapshotPayload | null = null
    if (ticket.orderType === "DELIVERY") {
      const order = await orderRepository.findById(db, ticket.orderId)
      const address = order?.deliveryAddress as Record<string, unknown> | null
      if (address) {
        deliveryAddressSnapshot = {
          street: address.street as string,
          number: address.number as string,
          complement: (address.complement as string | null) ?? null,
          neighborhood: address.neighborhood as string,
          city: address.city as string,
          state: address.state as string,
          postalCode: address.postalCode as string,
          country: address.country as string,
          latitude: (address.latitude as number | null) ?? null,
          longitude: (address.longitude as number | null) ?? null,
        }
      }
    }

    await eventBus.publish(
      createEvent("kitchen_ticket.ready", storeId, null, {
        ticketId,
        orderId: ticket.orderId,
        orderNumber: ticket.orderNumber,
        orderType: ticket.orderType,
        readyAt: now.toISOString(),
        deliveryAddressSnapshot,
      }),
      db,
    )
    return updated
  },

  /** `PATCH /kitchen/items/:itemId/status`. Item-level only — never cascades to the parent ticket. */
  async updateItemStatus(db: DbClient, storeId: string, itemId: string, target: string): Promise<KitchenItem> {
    const item = await kitchenItemRepository.findById(db, itemId)
    if (!item) throw new NotFoundError("KITCHEN_ITEM_NOT_FOUND", "Kitchen item does not exist.")
    // Store Isolation (API_SPEC.md): KitchenItem has no storeId of its own — ownership is
    // verified through its parent ticket.
    const ticket = await kitchenTicketRepository.findById(db, item.ticketId)
    if (!ticket || ticket.storeId !== storeId) {
      throw new NotFoundError("KITCHEN_ITEM_NOT_FOUND", "Kitchen item does not exist.")
    }
    if (target !== "PREPARING" && target !== "READY") {
      throw new BadRequestError("INVALID_TRANSITION", "Transition not allowed.")
    }
    return kitchenItemRepository.update(db, itemId, { status: target })
  },
}

// Business Rule 16: a Kitchen Ticket is created automatically and atomically
// when an Order reaches CONFIRMED — this listener runs inside the same
// transaction as the order's status change (see order.service.ts).
eventBus.on("order.confirmed", async (event, db) => {
  const queuedAt = new Date()
  const ticket = await kitchenTicketRepository.create(db, {
    store: { connect: { id: event.storeId } },
    order: { connect: { id: event.payload.orderId } },
    orderNumber: event.payload.orderNumber,
    orderType: event.payload.type,
    notes: event.payload.orderNotes,
    queuedAt,
  })

  await kitchenItemRepository.createMany(
    db,
    event.payload.items.map((item) => ({
      ticketId: ticket.id,
      productName: item.productName,
      quantity: item.quantity,
      modifierSummary: item.modifierSummary,
      notes: item.notes,
    })),
  )

  await eventBus.publish(
    createEvent("kitchen_ticket.created", event.storeId, null, {
      ticketId: ticket.id,
      orderId: event.payload.orderId,
      orderNumber: event.payload.orderNumber,
      orderType: event.payload.type,
      queuedAt: queuedAt.toISOString(),
    }),
    db,
  )
})

// Business Rule 19: a cancelled Order immediately flags its Kitchen Ticket as CANCELLED.
eventBus.on("order.cancelled", async (event, db) => {
  const ticket = await kitchenTicketRepository.findByOrderId(db, event.payload.orderId)
  if (!ticket || ticket.status === "READY" || ticket.status === "CANCELLED") return
  await kitchenTicketRepository.update(db, ticket.id, { status: "CANCELLED", cancelledAt: new Date() })
})
