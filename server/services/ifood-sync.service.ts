import "server-only"
import type { DbClient } from "../db"
import { prisma } from "../db"
import { orderRepository, orderItemRepository, orderStatusTransitionRepository, marketplaceIntegrationRepository } from "../repositories"
import { eventBus, createEvent, logger } from "../lib"
import { toJsonInput, toNullableJsonInput } from "../lib/json"
import {
  getIfoodAccessToken,
  IfoodApiError,
  pollIfoodEvents,
  acknowledgeIfoodEvents,
  fetchIfoodOrder,
  confirmIfoodOrder,
  markIfoodOrderReadyToPickup,
  dispatchIfoodOrder,
  requestIfoodCancellation,
  mapIfoodOrder,
} from "../integrations/ifood"
import type { IfoodEvent } from "../integrations/ifood"

// ─────────────────────────────────────────────────────────────────────────
// Ingest a single iFood PLACED order into our DB
// ─────────────────────────────────────────────────────────────────────────

async function ingestIfoodOrder(storeId: string, ifoodOrderId: string): Promise<void> {
  // Idempotency: skip if already imported
  const existing = await orderRepository.findByExternalId(prisma, storeId, ifoodOrderId)
  if (existing) {
    logger.debug("ifood.ingest.already_exists", { storeId, ifoodOrderId })
    return
  }

  const accessToken = await getIfoodAccessToken()
  const ifoodOrder = await fetchIfoodOrder(accessToken, ifoodOrderId)
  const mapped = mapIfoodOrder(ifoodOrder)

  await prisma.$transaction(async (tx) => {
    const number = await orderRepository.getNextOrderNumber(tx, storeId)

    const order = await orderRepository.create(tx, {
      store: { connect: { id: storeId } },
      number,
      status: "PENDING",
      type: mapped.type,
      channel: mapped.channel,
      externalId: mapped.externalId,
      deliveryAddress: toNullableJsonInput(mapped.deliveryAddress),
      itemsTotal: mapped.itemsTotal,
      discountTotal: mapped.discountTotal,
      deliveryFee: mapped.deliveryFee,
      grandTotal: mapped.grandTotal,
      notes: mapped.notes,
      scheduledFor: mapped.scheduledFor,
    })

    await orderItemRepository.createMany(
      tx,
      mapped.items.map((item) => ({
        orderId: order.id,
        productId: null,
        productName: item.productName,
        productPrice: item.productPrice,
        quantity: item.quantity,
        selectedModifiers: toJsonInput(item.selectedModifiers),
        unitTotal: item.unitTotal,
        subtotal: item.subtotal,
        notes: item.notes,
      })),
    )

    await orderStatusTransitionRepository.create(tx, {
      order: { connect: { id: order.id } },
      status: "PENDING",
      triggeredByUser: undefined,
      notes: `Pedido iFood #${ifoodOrder.displayId}`,
    })

    await eventBus.publish(
      createEvent("order.created", storeId, null, {
        orderId: order.id,
        orderNumber: order.number,
        type: order.type,
        channel: order.channel,
        customerId: null,
        grandTotal: order.grandTotal,
        itemCount: mapped.items.length,
      }),
      tx,
    )

    // Update lastSyncAt on the integration record
    await marketplaceIntegrationRepository
      .findByMerchantId(tx, "IFOOD", ifoodOrder.merchant.id)
      .then((integration) => {
        if (integration) {
          return marketplaceIntegrationRepository.update(tx, integration.id, { lastSyncAt: new Date(), errorMessage: null })
        }
      })
      .catch(() => undefined) // non-critical
  }, { timeout: 30_000 })

  logger.info("ifood.ingest.order_created", { storeId, ifoodOrderId })
}

// ─────────────────────────────────────────────────────────────────────────
// Process a batch of iFood events (from webhook or polling)
// ─────────────────────────────────────────────────────────────────────────

export async function processIfoodEvents(events: IfoodEvent[]): Promise<void> {
  const toAcknowledge: string[] = []

  for (const event of events) {
    if (event.fullCode === "KEEPALIVE" || !event.orderId || !event.merchantId) {
      toAcknowledge.push(event.id)
      continue
    }

    try {
      if (event.fullCode === "PLACED") {
        const integration = await marketplaceIntegrationRepository.findByMerchantId(prisma, "IFOOD", event.merchantId)
        if (integration) {
          await ingestIfoodOrder(integration.storeId, event.orderId)
        } else {
          logger.warn("ifood.events.unknown_merchant", { merchantId: event.merchantId })
        }
      }
      // For all other event types we just acknowledge — status changes originate
      // from our own UI and are synced outbound via domain event listeners below.
      toAcknowledge.push(event.id)
    } catch (err) {
      logger.error("ifood.events.process_error", {
        eventId: event.id,
        eventCode: event.fullCode,
        orderId: event.orderId,
        error: err instanceof Error ? err.message : String(err),
      })
      // Do NOT acknowledge failed events — iFood will redeliver them
    }
  }

  if (toAcknowledge.length > 0) {
    try {
      const accessToken = await getIfoodAccessToken()
      await acknowledgeIfoodEvents(accessToken, toAcknowledge)
    } catch (err) {
      logger.error("ifood.events.acknowledge_error", { error: err instanceof Error ? err.message : String(err) })
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Poll all active iFood integrations (called by the cron handler)
// ─────────────────────────────────────────────────────────────────────────

export async function pollAllIfoodStores(): Promise<void> {
  const integrations = await marketplaceIntegrationRepository.findActiveByPlatform(prisma, "IFOOD")
  if (integrations.length === 0) return

  logger.info("ifood.poll.start", { storeCount: integrations.length })

  let accessToken: string
  try {
    accessToken = await getIfoodAccessToken()
  } catch (err) {
    logger.error("ifood.poll.auth_error", { error: err instanceof Error ? err.message : String(err) })
    return
  }

  const merchantIds = integrations.map((i) => i.merchantId)
  let events: IfoodEvent[]
  try {
    events = await pollIfoodEvents(accessToken, merchantIds)
  } catch (err) {
    logger.error("ifood.poll.fetch_error", { error: err instanceof Error ? err.message : String(err) })
    return
  }

  if (events.length === 0) {
    logger.debug("ifood.poll.no_events")
    return
  }

  logger.info("ifood.poll.events_received", { count: events.length })
  await processIfoodEvents(events)
}

// ─────────────────────────────────────────────────────────────────────────
// Domain event listeners — sync our status changes back to iFood
// ─────────────────────────────────────────────────────────────────────────

async function getExternalId(db: DbClient, orderId: string): Promise<{ externalId: string; channel: string } | null> {
  const order = await orderRepository.findById(db, orderId)
  if (!order || order.channel !== "MARKETPLACE" || !order.externalId) return null
  return { externalId: order.externalId, channel: order.channel }
}

async function withIfoodAction(
  db: DbClient,
  orderId: string,
  action: (token: string, externalId: string) => Promise<void>,
  label: string,
): Promise<void> {
  const ctx = await getExternalId(db, orderId)
  if (!ctx) return // not a marketplace order

  try {
    const token = await getIfoodAccessToken()
    await action(token, ctx.externalId)
    logger.info(`ifood.action.${label}`, { orderId, externalId: ctx.externalId })
  } catch (err) {
    // Log but never throw — a failed iFood sync must not abort the local transaction
    if (err instanceof IfoodApiError && err.status === 422) {
      // iFood rejects actions on orders already in a terminal state — this is normal after cancellations etc.
      logger.debug(`ifood.action.${label}.already_terminal`, { orderId, externalId: ctx.externalId })
    } else {
      logger.error(`ifood.action.${label}.error`, {
        orderId,
        externalId: ctx.externalId,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }
}

// order.confirmed → POST /confirm to iFood
eventBus.on("order.confirmed", "ifood-sync:order.confirmed", async (event, db) => {
  await withIfoodAction(db, event.payload.orderId, confirmIfoodOrder, "confirm")
})

// order.ready → POST /readyToPickup (for TAKEAWAY orders or iFood-handled delivery)
eventBus.on("order.ready", "ifood-sync:order.ready", async (event, db) => {
  await withIfoodAction(db, event.payload.orderId, markIfoodOrderReadyToPickup, "ready_to_pickup")
})

// order.out_for_delivery → POST /dispatch (merchant-handled delivery)
eventBus.on("order.out_for_delivery", "ifood-sync:order.out_for_delivery", async (event, db) => {
  await withIfoodAction(
    db,
    event.payload.orderId,
    (token, externalId) => dispatchIfoodOrder(token, externalId, "MERCHANT"),
    "dispatch",
  )
})

// order.cancelled → POST /requestCancellation
eventBus.on("order.cancelled", "ifood-sync:order.cancelled", async (event, db) => {
  await withIfoodAction(db, event.payload.orderId, requestIfoodCancellation, "request_cancellation")
})

export const ifoodSyncService = { processIfoodEvents, pollAllIfoodStores, ingestIfoodOrder }
