import "server-only"
import type { DbClient } from "../db"
import { prisma } from "../db"
import { orderRepository, orderItemRepository, orderStatusTransitionRepository, marketplaceIntegrationRepository, storeSettingsRepository, paymentRepository, paymentAttemptRepository, deliveryRepository } from "../repositories"
import { eventBus, createEvent, logger } from "../lib"
import { orderService } from "./order.service"
import { deliveryService } from "./delivery.service"
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
  mapCancellationReason,
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

  let createdOrderId: string | null = null

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
      deliveredBy: mapped.deliveredBy ?? null,
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
      .catch((err) => logger.warn("ifood.ingest.last_sync_update_failed", { storeId, error: err instanceof Error ? err.message : String(err) }))

    createdOrderId = order.id
  }, { timeout: 30_000 })

  logger.info("ifood.ingest.order_created", { storeId, ifoodOrderId })

  // ── Auto-confirm ──────────────────────────────────────────────────────────
  // Marketplace orders are created at PENDING (bypassing the DRAFT→PENDING flow
  // that normally triggers auto-confirm). We replicate the check here.
  const settings = await storeSettingsRepository.findByStoreId(prisma, storeId)

  if (!createdOrderId) return

  let confirmedOrderId: string | null = null
  if (settings?.autoConfirmOrders) {
    try {
      await orderService.updateStatus(prisma, storeId, createdOrderId, "CONFIRMED", {
        triggeredByUserId: null,
        notes: "Auto-confirmado pelo sistema (pedido iFood)",
      })
      confirmedOrderId = createdOrderId
      logger.info("ifood.ingest.auto_confirmed", { storeId, orderId: createdOrderId })
    } catch (err) {
      logger.error("ifood.ingest.auto_confirm_error", {
        storeId,
        orderId: createdOrderId,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  // ── Auto-register payment ─────────────────────────────────────────────────
  // Bypass paymentService.initiate (which gates on store settings like
  // acceptsOnlinePayment). iFood payments are external — they already happened —
  // so store settings must not block them.
  // - Fully prepaid via iFood (isPrepaid): create PAID payment immediately
  // - Pay-on-delivery (COD): create PENDING payment, leave for operator
  // Use createdOrderId as fallback so payment is always registered even if
  // auto-confirm failed (the order still exists and needs its payment recorded).
  const orderIdForPayment = confirmedOrderId ?? createdOrderId
  if (orderIdForPayment && mapped.payment) {
    try {
      const order = await orderRepository.findById(prisma, orderIdForPayment)
      if (order) {
        const amount = order.grandTotal
        const method = mapped.payment.method
        const gateway = "IFOOD"
        const now = new Date()

        const payment = await paymentRepository.create(prisma, {
          order: { connect: { id: orderIdForPayment } },
          store: { connect: { id: storeId } },
          amount,
          method,
          gateway,
        })

        const attempt = await paymentAttemptRepository.create(prisma, {
          order: { connect: { id: orderIdForPayment } },
          store: { connect: { id: storeId } },
          amount,
          method,
          gateway,
        })

        if (mapped.payment.isPrepaid) {
          await paymentAttemptRepository.update(prisma, attempt.id, { status: "CAPTURED", resolvedAt: now })
          await paymentRepository.update(prisma, payment.id, {
            status: "PAID",
            paidAt: now,
            successfulAttempt: { connect: { id: attempt.id } },
          })
          await eventBus.publish(
            createEvent("payment.paid", storeId, null, {
              paymentId: payment.id,
              orderId: orderIdForPayment,
              customerId: order.customerId ?? null,
              amount,
              method,
              gateway,
              paidAt: now.toISOString(),
            }),
            prisma,
          )
          logger.info("ifood.ingest.payment_confirmed", { storeId, orderId: orderIdForPayment, method })
        } else {
          await eventBus.publish(
            createEvent("payment.created", storeId, null, { paymentId: payment.id, orderId: orderIdForPayment, amount, method, gateway }),
            prisma,
          )
          logger.info("ifood.ingest.payment_pending", { storeId, orderId: orderIdForPayment, method })
        }
      }
    } catch (err) {
      logger.error("ifood.ingest.payment_error", {
        storeId,
        orderId: orderIdForPayment,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }
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
      } else if (event.fullCode === "CANCELLED") {
        // iFood cancelled the order (customer request, platform decision, timeout, etc.)
        // Sync the cancellation into MarginFlow so operators don't see stale active orders.
        const integration = await marketplaceIntegrationRepository.findByMerchantId(prisma, "IFOOD", event.merchantId)
        if (integration) {
          const { storeId } = integration
          const order = await orderRepository.findByExternalId(prisma, storeId, event.orderId)
          if (order && order.status !== "CANCELLED" && order.status !== "DELIVERED") {
            await orderService.updateStatus(prisma, storeId, order.id, "CANCELLED", {
              triggeredByUserId: null,
              reason: "Cancelado pelo iFood",
              notes: "Cancelamento iniciado pela plataforma iFood.",
            })
            logger.info("ifood.events.order_cancelled_by_ifood", { storeId, orderId: order.id })
          }
        }
      } else if (event.fullCode === "DISPATCHED" || event.fullCode === "CONCLUDED") {
        const integration = await marketplaceIntegrationRepository.findByMerchantId(prisma, "IFOOD", event.merchantId)
        if (integration) {
          const { storeId } = integration
          const order = await orderRepository.findByExternalId(prisma, storeId, event.orderId)
          if (order && order.deliveredBy === "IFOOD") {
            const delivery = await deliveryRepository.findByOrderId(prisma, order.id)
            if (delivery) {
              if (event.fullCode === "DISPATCHED") {
                await deliveryService.updateStatus(prisma, storeId, delivery.id, "DISPATCHED", {})
                logger.info("ifood.events.delivery_dispatched", { storeId, orderId: order.id, deliveryId: delivery.id })
              } else {
                // CONCLUDED — mark delivered
                await deliveryService.updateStatus(prisma, storeId, delivery.id, "DELIVERED", {})
                logger.info("ifood.events.delivery_delivered", { storeId, orderId: order.id, deliveryId: delivery.id })

                // Auto-confirm COD payment if pending
                const payment = await paymentRepository.findByOrderId(prisma, order.id)
                if (payment && payment.status === "PENDING") {
                  const now = new Date()
                  const attempts = await paymentAttemptRepository.findManyByOrder(prisma, order.id)
                  const pendingAttempt = attempts.find((a) => a.status === "PENDING")
                  if (pendingAttempt) {
                    await paymentAttemptRepository.update(prisma, pendingAttempt.id, { status: "CAPTURED", resolvedAt: now })
                  }
                  await paymentRepository.update(prisma, payment.id, {
                    status: "PAID",
                    paidAt: now,
                    successfulAttempt: pendingAttempt ? { connect: { id: pendingAttempt.id } } : undefined,
                  })
                  await eventBus.publish(
                    createEvent("payment.paid", storeId, null, {
                      paymentId: payment.id,
                      orderId: order.id,
                      customerId: order.customerId ?? null,
                      amount: payment.amount,
                      method: payment.method,
                      gateway: payment.gateway,
                      paidAt: now.toISOString(),
                    }),
                    prisma,
                  )
                  logger.info("ifood.events.cod_payment_confirmed", { storeId, orderId: order.id, paymentId: payment.id })
                }
              }
            }
          }
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

// order.cancelled → POST /requestCancellation with mapped reason code
eventBus.on("order.cancelled", "ifood-sync:order.cancelled", async (event, db) => {
  const ifoodReason = mapCancellationReason(event.payload.cancelledReason)
  await withIfoodAction(
    db,
    event.payload.orderId,
    (token, externalId) => requestIfoodCancellation(token, externalId, ifoodReason),
    "request_cancellation",
  )
})

export const ifoodSyncService = { processIfoodEvents, pollAllIfoodStores, ingestIfoodOrder }
