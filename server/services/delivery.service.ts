import "server-only"
import type { DbClient } from "../db"
import type { Delivery, Prisma } from "../../generated/prisma/client"
import { deliveryRepository } from "../repositories"
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "../lib/errors"
import { eventBus, createEvent } from "../lib/events"
import { toJsonInput } from "../lib/json"

export interface AssignCourierInput {
  courierName: string
  courierPhone?: string | null
  courierType: string
  platform?: string | null
  platformDeliveryId?: string | null
  estimatedMinutes?: number | null
}

const ACTIVE_DELIVERY_STATUSES = ["AWAITING_PICKUP", "DISPATCHED", "IN_TRANSIT"]

/** Store Isolation (API_SPEC.md): masks a delivery belonging to another store as not-found. */
async function getDeliveryOrThrow(db: DbClient, storeId: string, id: string): Promise<Delivery> {
  const delivery = await deliveryRepository.findById(db, id)
  if (!delivery || delivery.storeId !== storeId) throw new NotFoundError("DELIVERY_NOT_FOUND", "Delivery does not exist in this store.")
  return delivery
}

export const deliveryService = {
  getById: getDeliveryOrThrow,
  listByStore: deliveryRepository.findManyByStore,
  count: deliveryRepository.count,
  findByOrderId: deliveryRepository.findByOrderId,

  /** `PATCH /deliveries/:deliveryId`. Reassigning after dispatch requires manager/owner role. */
  async assignCourier(
    db: DbClient,
    storeId: string,
    deliveryId: string,
    input: AssignCourierInput,
    isManagerOrOwner: boolean,
  ): Promise<Delivery> {
    const delivery = await getDeliveryOrThrow(db, storeId, deliveryId)
    if (delivery.status !== "AWAITING_PICKUP" && !isManagerOrOwner) {
      throw new ForbiddenError("INSUFFICIENT_PERMISSIONS", "Reassigning a courier after dispatch requires manager or owner role.")
    }
    if (input.courierType === "PLATFORM" && !input.platform) {
      throw new BadRequestError("VALIDATION_ERROR", "platform is required when courierType = PLATFORM.")
    }
    return deliveryRepository.update(db, deliveryId, input as Prisma.DeliveryUpdateInput)
  },

  /**
   * `POST /deliveries/:deliveryId/status`. `target = FAILED` from
   * DISPATCHED/IN_TRANSIT additionally requires manager/owner approval —
   * `isManagerOrOwner` is a Controller-resolved RBAC decision (see
   * order.service.ts's `isManagerApproved` for the same pattern).
   */
  async updateStatus(
    db: DbClient,
    storeId: string,
    deliveryId: string,
    target: string,
    opts: { reason?: string; isManagerOrOwner?: boolean },
  ): Promise<Delivery> {
    const delivery = await getDeliveryOrThrow(db, storeId, deliveryId)
    const now = new Date()

    if (target === "DISPATCHED") {
      if (delivery.status !== "AWAITING_PICKUP") throw new BadRequestError("INVALID_TRANSITION", "Transition not allowed.")
      const updated = await deliveryRepository.update(db, deliveryId, { status: "DISPATCHED", dispatchedAt: now })
      await eventBus.publish(
        createEvent("delivery.dispatched", storeId, null, {
          deliveryId,
          orderId: delivery.orderId,
          courierName: delivery.courierName,
          courierType: delivery.courierType,
          platform: delivery.platform,
          dispatchedAt: now.toISOString(),
        }),
        db,
      )
      return updated
    }

    if (target === "IN_TRANSIT") {
      if (delivery.status !== "DISPATCHED") throw new BadRequestError("INVALID_TRANSITION", "Transition not allowed.")
      return deliveryRepository.update(db, deliveryId, { status: "IN_TRANSIT" })
    }

    if (target === "DELIVERED") {
      if (delivery.status !== "IN_TRANSIT" && delivery.status !== "DISPATCHED") {
        throw new BadRequestError("INVALID_TRANSITION", "Transition not allowed.")
      }
      const updated = await deliveryRepository.update(db, deliveryId, { status: "DELIVERED", deliveredAt: now })
      await eventBus.publish(
        createEvent("delivery.delivered", storeId, null, { deliveryId, orderId: delivery.orderId, deliveredAt: now.toISOString() }),
        db,
      )
      return updated
    }

    if (target === "FAILED") {
      if (delivery.status !== "DISPATCHED" && delivery.status !== "IN_TRANSIT") {
        throw new BadRequestError("INVALID_TRANSITION", "Transition not allowed.")
      }
      // API_SPEC.md: `reason` is required for the FAILED transition (enforced at
      // the Zod layer too). Reuses the same VALIDATION_ERROR code assignCourier
      // already uses for a missing required field — no new error code introduced.
      if (!opts.reason || opts.reason.trim().length === 0) {
        throw new BadRequestError("VALIDATION_ERROR", "reason is required when transitioning to FAILED.")
      }
      if (!opts.isManagerOrOwner) {
        throw new ConflictError(
          "DISPATCHED_DELIVERY_CANCEL_REQUIRES_MANAGER",
          "Failing a dispatched delivery requires manager or owner approval.",
        )
      }
      const reason = opts.reason
      const updated = await deliveryRepository.update(db, deliveryId, { status: "FAILED", failedAt: now, failedReason: reason })
      await eventBus.publish(
        createEvent("delivery.failed", storeId, null, {
          deliveryId,
          orderId: delivery.orderId,
          failedReason: reason,
          failedAt: now.toISOString(),
        }),
        db,
      )
      return updated
    }

    if (target === "RETURNED") {
      if (delivery.status !== "FAILED") throw new BadRequestError("INVALID_TRANSITION", "Transition not allowed.")
      return deliveryRepository.update(db, deliveryId, { status: "RETURNED" })
    }

    throw new BadRequestError("INVALID_TRANSITION", "The requested transition is not allowed.")
  },
}

// Business Rule 20: Delivery only begins after the Kitchen Ticket reaches READY,
// and only for DELIVERY orders — the raw event carries the address snapshot.
eventBus.on("kitchen_ticket.ready", async (event, db) => {
  if (event.payload.orderType !== "DELIVERY" || !event.payload.deliveryAddressSnapshot) return

  const createdAt = new Date()
  const delivery = await deliveryRepository.create(db, {
    order: { connect: { id: event.payload.orderId } },
    store: { connect: { id: event.storeId } },
    status: "AWAITING_PICKUP",
    deliveryAddress: toJsonInput(event.payload.deliveryAddressSnapshot),
    createdAt,
  })

  await eventBus.publish(
    createEvent("delivery.created", event.storeId, null, {
      deliveryId: delivery.id,
      orderId: event.payload.orderId,
      orderNumber: event.payload.orderNumber,
      deliveryAddress: event.payload.deliveryAddressSnapshot,
      createdAt: createdAt.toISOString(),
    }),
    db,
  )
})

// Business Rule 22: cancelling an Order cancels/fails its Delivery — a
// dispatched delivery requires the Controller-resolved manager approval
// carried on the event payload (see events/types.ts `OrderCancelledPayload`).
eventBus.on("order.cancelled", async (event, db) => {
  const delivery = await deliveryRepository.findByOrderId(db, event.payload.orderId)
  if (!delivery || !ACTIVE_DELIVERY_STATUSES.includes(delivery.status)) return

  const isDispatched = delivery.status === "DISPATCHED" || delivery.status === "IN_TRANSIT"
  if (isDispatched && !event.payload.isManagerApproved) {
    throw new ConflictError(
      "DISPATCHED_DELIVERY_CANCEL_REQUIRES_MANAGER",
      "Cancelling a dispatched delivery requires manager or owner approval.",
    )
  }

  await deliveryRepository.update(db, delivery.id, {
    status: "FAILED",
    failedAt: new Date(),
    failedReason: `Order cancelled: ${event.payload.cancelledReason}`,
  })
})
