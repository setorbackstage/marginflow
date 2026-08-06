import "server-only"
import type { DbClient } from "../../db"
import { prisma } from "../../db"
import {
  orderRepository,
  orderItemRepository,
  orderStatusTransitionRepository,
  marketplaceIntegrationRepository,
  customerRepository,
  deliveryRepository,
  paymentRepository,
  paymentAttemptRepository,
} from "../../repositories"
import { eventBus, createEvent, logger } from "../../lib"
import { orderService } from "../../services/order.service"
import { deliveryService } from "../../services/delivery.service"
import { toJsonInput, toNullableJsonInput } from "../../lib/json"
import { mapOpenDeliveryOrder, mapOdEventToMfStatus } from "./mapper"
import type { OdOrder, OdOrderEvent, OdOrderEventType } from "./types"

const PLATFORM = "OPENDELIVERY"

// ─────────────────────────────────────────────────────────────────────────
// Ingest a single Open Delivery v2 order into our DB (idempotent)
// ─────────────────────────────────────────────────────────────────────────

export async function ingestOpenDeliveryOrder(
  storeId: string,
  order: OdOrder,
): Promise<void> {
  const externalId = order.id
  // Idempotency: skip if already imported
  const existing = await orderRepository.findByExternalId(prisma, storeId, externalId)
  if (existing) {
    logger.debug("opendelivery.ingest.already_exists", { storeId, externalId })
    return
  }

  const mapped = mapOpenDeliveryOrder(order)

  await prisma.$transaction(async (tx) => {
    let customerId: string | null = null
    if (mapped.customerPhone) {
      const now = new Date()
      let customer = await customerRepository.findByStoreAndPhone(tx, storeId, mapped.customerPhone)
      if (!customer && mapped.customerName) {
        customer = await customerRepository.create(tx, {
          store: { connect: { id: storeId } },
          name: mapped.customerName,
          phone: mapped.customerPhone,
          taxId: mapped.customerDocument ?? undefined,
          firstOrderAt: now,
          lastOrderAt: now,
          totalOrders: 0,
          totalSpent: 0,
        })
        logger.info("opendelivery.ingest.customer_created", { storeId, phone: mapped.customerPhone })
      } else if (customer && !customer.firstOrderAt) {
        await customerRepository.update(tx, customer.id, { firstOrderAt: now })
      }
      customerId = customer?.id ?? null
    }

    const number = await orderRepository.getNextOrderNumber(tx, storeId)

    const created = await orderRepository.create(tx, {
      store: { connect: { id: storeId } },
      ...(customerId ? { customer: { connect: { id: customerId } } } : {}),
      number,
      status: "PENDING",
      type: mapped.type,
      channel: mapped.channel,
      externalId: mapped.externalId || externalId,
      deliveryAddress: toNullableJsonInput(mapped.deliveryAddress),
      itemsTotal: mapped.itemsTotal,
      discountTotal: mapped.discountTotal,
      deliveryFee: mapped.deliveryFee,
      grandTotal: mapped.grandTotal,
      notes: mapped.notes,
      scheduledFor: mapped.scheduledFor,
      deliveredBy: mapped.deliveredBy ?? null,
      customerName: mapped.customerName ?? null,
      customerPhone: mapped.customerPhone ?? null,
      customerDocument: mapped.customerDocument ?? null,
      platform: PLATFORM,
    })

    await orderItemRepository.createMany(
      tx,
      mapped.items.map((item) => ({
        orderId: created.id,
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
      order: { connect: { id: created.id } },
      status: "PENDING",
      triggeredByUser: undefined,
      notes: `Pedido Open Delivery #${mapped.externalId || externalId}`,
    })

    await eventBus.publish(
      createEvent("order.created", storeId, null, {
        orderId: created.id,
        orderNumber: created.number,
        type: created.type,
        channel: created.channel,
        customerId: customerId ?? null,
        grandTotal: created.grandTotal,
        itemCount: mapped.items.length,
      }),
      tx,
    )

    if (customerId) {
      await customerRepository.update(tx, customerId, {
        totalOrders: { increment: 1 },
        totalSpent: { increment: mapped.grandTotal },
        lastOrderAt: new Date(),
      })
    }

    logger.info("opendelivery.ingest.order_created", {
      storeId,
      orderId: created.id,
      externalId: mapped.externalId || externalId,
    })

    // Marketplace orders arrive already accepted by the platform. Command the
    // CONFIRMED transition so the ecosystem listeners (kitchen ticket, stock,
    // printing, notifications, sync) fire — matching iFood/99Food behavior.
    await orderService.updateStatus(tx, storeId, created.id, "CONFIRMED", {
      triggeredByUserId: null,
      notes: "Confirmado automaticamente (pedido de marketplace Open Delivery)",
    })
  })
}

// ─────────────────────────────────────────────────────────────────────────
// Process Open Delivery v2 events (webhook or polling)
// ─────────────────────────────────────────────────────────────────────────

export async function processOpenDeliveryEvents(events: OdOrderEvent[]): Promise<void> {
  for (const event of events) {
    const merchantId = event.sourceAppId ?? ""
    if (!merchantId || !event.orderId) continue

    try {
      const integration = await marketplaceIntegrationRepository.findByMerchantId(
        prisma,
        PLATFORM,
        merchantId,
      )
      if (!integration) {
        logger.warn("opendelivery.events.unknown_merchant", { merchantId, eventId: event.eventId })
        continue
      }
      const { storeId } = integration

      // CREATED may carry the full order snapshot in the event payload.
      if (event.eventType === "CREATED" && (event as OdOrderEvent & { order?: OdOrder }).order) {
        await ingestOpenDeliveryOrder(storeId, (event as OdOrderEvent & { order: OdOrder }).order)
        continue
      }

      const order = await orderRepository.findByExternalId(prisma, storeId, event.orderId)
      if (!order) {
        logger.warn("opendelivery.events.order_not_found", { storeId, orderId: event.orderId })
        continue
      }

      const projected = mapOdEventToMfStatus(event.eventType)

      // Informational / handshake events: log, never mutate authoritative status.
      if (projected === null) {
        logger.info("opendelivery.events.informational", {
          storeId,
          orderId: order.id,
          eventType: event.eventType,
        })
        continue
      }

      // Status-projecting events: apply with guards (idempotent replay safe).
      switch (event.eventType) {
        case "CANCELLED":
          if (order.status !== "CANCELLED" && order.status !== "DELIVERED") {
            await orderService.updateStatus(prisma, storeId, order.id, "CANCELLED", {
              triggeredByUserId: null,
              reason: "Cancelado via Open Delivery",
              notes: "Cancelamento iniciado pela plataforma (Open Delivery).",
            })
            logger.info("opendelivery.events.order_cancelled", { storeId, orderId: order.id })
          }
          break

        case "DELIVERED":
          if (order.deliveredBy === PLATFORM || order.deliveredBy === "MARKETPLACE") {
            const delivery = await deliveryRepository.findByOrderId(prisma, order.id)
            if (delivery) {
              await deliveryService.updateStatus(prisma, storeId, delivery.id, "DELIVERED", {})
            }
            // Auto-confirm COD payment if pending (mirrors iFood/99Food).
            const payment = await paymentRepository.findByOrderId(prisma, order.id)
            if (payment && payment.status === "PENDING") {
              const now = new Date()
              const attempts = await paymentAttemptRepository.findManyByOrder(prisma, order.id)
              const pendingAttempt = attempts.find((a) => a.status === "PENDING")
              if (pendingAttempt) {
                await paymentAttemptRepository.update(prisma, pendingAttempt.id, {
                  status: "CAPTURED",
                  resolvedAt: now,
                })
              }
              await paymentRepository.update(prisma, payment.id, {
                status: "PAID",
                paidAt: now,
                successfulAttempt: pendingAttempt
                  ? { connect: { id: pendingAttempt.id } }
                  : undefined,
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
              logger.info("opendelivery.events.cod_payment_confirmed", { storeId, orderId: order.id })
            }
          }
          await orderService.updateStatus(prisma, storeId, order.id, "DELIVERED", {
            triggeredByUserId: null,
            notes: "Entregue (Open Delivery)",
          })
          break

        case "DISPATCHED":
          if (order.status !== "OUT_FOR_DELIVERY" && order.status !== "DELIVERED") {
            const delivery = await deliveryRepository.findByOrderId(prisma, order.id)
            if (delivery) {
              await deliveryService.updateStatus(prisma, storeId, delivery.id, "DISPATCHED", {})
            }
            await orderService.updateStatus(prisma, storeId, order.id, "OUT_FOR_DELIVERY", {
              triggeredByUserId: null,
              notes: "Em rota de entrega (Open Delivery)",
            })
            logger.info("opendelivery.events.order_dispatched", { storeId, orderId: order.id })
          }
          break

        default:
          // CONFIRMED / PREPARING / READY_FOR_PICKUP / CONCLUDED
          if (order.status !== projected) {
            await orderService.updateStatus(prisma, storeId, order.id, projected, {
              triggeredByUserId: null,
              notes: `Open Delivery evento ${event.eventType}`,
            })
            logger.info("opendelivery.events.status_applied", {
              storeId,
              orderId: order.id,
              eventType: event.eventType,
              status: projected,
            })
          }
      }
    } catch (err) {
      logger.error("opendelivery.events.process_error", {
        eventId: event.eventId,
        eventType: event.eventType,
        orderId: event.orderId,
        error: err instanceof Error ? err.message : String(err),
      })
      // Do NOT rethrow: Open Delivery delivers at-least-once; failing here would
      // cause redelivery storms. The event is safe to skip and reconcile via GET.
    }
  }
}

export type { OdOrderEventType }
