import "server-only"
import type { DbClient } from "../db"
import { prisma } from "../db"
import {
  orderRepository,
  orderItemRepository,
  orderStatusTransitionRepository,
  marketplaceIntegrationRepository,
  customerRepository,
  deliveryRepository,
  paymentRepository,
  paymentAttemptRepository,
} from "../repositories"
import { eventBus, createEvent, logger } from "../lib"
import { orderService } from "./order.service"
import { deliveryService } from "./delivery.service"
import { toJsonInput, toNullableJsonInput } from "../lib/json"
import {
  getNinetyNineFoodAccessToken,
  mapNinetyNineFoodOrderInfo,
} from "../integrations/ninetyNineFood"
import type { NinetyNineFoodWebhookEvent } from "../integrations/ninetyNineFood"

// ─────────────────────────────────────────────────────────────────────────
// Ingest a single 99Food orderNew into our DB (data already provided by webhook)
// ─────────────────────────────────────────────────────────────────────────

async function ingestNinetyNineFoodOrder(
  storeId: string,
  externalId: string,
  orderInfo: NonNullable<NinetyNineFoodWebhookEvent["data"]>["order_info"],
): Promise<void> {
  // Idempotency: skip if already imported
  const existing = await orderRepository.findByExternalId(prisma, storeId, externalId)
  if (existing) {
    logger.debug("99food.ingest.already_exists", { storeId, externalId })
    return
  }

  const mapped = mapNinetyNineFoodOrderInfo(orderInfo ?? {})

  await prisma.$transaction(async (tx) => {
    // ── Customer upsert (CPF/document OPTIONAL — 99Food does not send it) ──
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
        logger.info("99food.ingest.customer_created", { storeId, phone: mapped.customerPhone })
      } else if (customer && !customer.firstOrderAt) {
        await customerRepository.update(tx, customer.id, { firstOrderAt: now })
      }
      customerId = customer?.id ?? null
    }

    const number = await orderRepository.getNextOrderNumber(tx, storeId)

    const order = await orderRepository.create(tx, {
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
      // CPF/document is OPTIONAL — never required.
      customerDocument: mapped.customerDocument ?? null,
      // Platform of origin — distinct from channel (always MARKETPLACE) so the UI
      // can tell 99Food apart from iFood (P1-05).
      platform: "99FOOD",
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
      notes: `Pedido 99Food #${mapped.externalId || externalId}`,
    })

    await eventBus.publish(
      createEvent("order.created", storeId, null, {
        orderId: order.id,
        orderNumber: order.number,
        type: order.type,
        channel: order.channel,
        customerId: customerId ?? null,
        grandTotal: order.grandTotal,
        itemCount: mapped.items.length,
      }),
      tx,
    )

    // Marketplace orders arrive already paid/accepted by the platform. Publish
    // `order.confirmed` so the ecosystem (kitchen ticket, stock consumption,
    // printing, notifications, iFood sync) fires — without this, marketplace
    // orders stayed stuck in PENDING forever (P0-01).
    await eventBus.publish(
      createEvent("order.confirmed", storeId, null, {
        orderId: order.id,
        orderNumber: order.number,
        type: order.type,
        orderNotes: order.notes ?? null,
        confirmedAt: new Date().toISOString(),
        items: mapped.items.map((item) => ({
          orderItemId: "",
          productId: item.productId ?? null,
          productName: item.productName,
          quantity: item.quantity,
          modifierSummary: [],
          notes: item.notes ?? null,
          unitPrice: item.unitTotal,
          subtotal: item.subtotal,
        })),
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

    logger.info("99food.ingest.order_created", { storeId, orderId: order.id, externalId: mapped.externalId || externalId })
  })
}

// ─────────────────────────────────────────────────────────────────────────
// Process 99Food webhook events
// ─────────────────────────────────────────────────────────────────────────

export async function processNinetyNineFoodEvents(events: NinetyNineFoodWebhookEvent[]): Promise<void> {
  for (const event of events) {
    const appShopId = event.app_shop_id
    const code = event.type
    if (!appShopId || !code) continue

    try {
      // Resolve the local store from the 99Food app_shop_id
      const integration = await marketplaceIntegrationRepository.findByMerchantId(
        prisma,
        "99FOOD",
        appShopId,
      )

      const orderId = String(event.data?.order_id ?? event.data?.order_info?.order_id ?? "")
      const orderInfo = event.data?.order_info

      if (code === "orderNew") {
        if (integration) {
          await ingestNinetyNineFoodOrder(integration.storeId, orderId, orderInfo)
        } else {
          logger.warn("99food.events.unknown_shop", { appShopId })
        }
      } else if (code === "orderCancel") {
        if (integration && orderId) {
          const { storeId } = integration
          const order = await orderRepository.findByExternalId(prisma, storeId, orderId)
          if (order && order.status !== "CANCELLED" && order.status !== "DELIVERED") {
            await orderService.updateStatus(prisma, storeId, order.id, "CANCELLED", {
              triggeredByUserId: null,
              reason: "Cancelado pelo 99Food",
              notes: "Cancelamento iniciado pela plataforma 99Food.",
            })
            logger.info("99food.events.order_cancelled", { storeId, orderId: order.id })
          }
        }
      } else if (code === "orderFinish") {
        if (integration && orderId) {
          const { storeId } = integration
          const order = await orderRepository.findByExternalId(prisma, storeId, orderId)
          if (order && order.deliveredBy === "99FOOD") {
            const delivery = await deliveryRepository.findByOrderId(prisma, order.id)
            if (delivery) {
              await deliveryService.updateStatus(prisma, storeId, delivery.id, "DELIVERED", {})
              logger.info("99food.events.delivery_delivered", { storeId, orderId: order.id })

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
                logger.info("99food.events.cod_payment_confirmed", { storeId, orderId: order.id })
              }
            }
          }
        }
      }
    } catch (err) {
      logger.error("99food.events.process_error", {
        code,
        appShopId,
        error: err instanceof Error ? err.message : String(err),
      })
      // Re-throw so the webhook returns 500 and 99Food retries.
      throw err
    }
  }
}
