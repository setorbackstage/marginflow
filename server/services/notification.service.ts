import "server-only"
import { eventBus } from "@/server/lib"
import { notificationRepository } from "@/server/repositories"
import { logger } from "@/server/lib/logger"

function cents(amount: number): string {
  return `R$ ${(amount / 100).toFixed(2).replace(".", ",")}`
}

const PAYMENT_METHOD: Record<string, string> = {
  CASH: "Dinheiro",
  CARD_DEBIT: "Débito",
  CARD_CREDIT: "Crédito",
  PIX: "PIX",
  VOUCHER: "Vale",
  ONLINE: "Online",
}

// Self-registers listeners at module-import time (same pattern as ifood-sync.service.ts).
// As long as server/services/index.ts is imported, these run before the first request.

eventBus.on("order.created", "notification-service:order.created", async (event, db) => {
  try {
    const { orderId, orderNumber, grandTotal, itemCount, channel } = event.payload
    const suffix = channel === "MARKETPLACE" ? " · iFood" : ""
    await notificationRepository.create(db, {
      storeId: event.storeId,
      type: "NEW_ORDER",
      title: `Novo pedido #${orderNumber}`,
      body: `${itemCount} ${itemCount === 1 ? "item" : "itens"} · ${cents(grandTotal)}${suffix}`,
      link: `/orders/${orderId}`,
      metadata: { orderId, orderNumber },
    })
  } catch (err) {
    logger.warn("notification-service.order.created", { error: String(err) })
  }
})

eventBus.on("order.cancelled", "notification-service:order.cancelled", async (event, db) => {
  try {
    const { orderId, orderNumber, cancelledReason } = event.payload
    await notificationRepository.create(db, {
      storeId: event.storeId,
      type: "ORDER_CANCELLED",
      title: `Pedido #${orderNumber} cancelado`,
      body: cancelledReason ?? "Pedido cancelado.",
      link: `/orders/${orderId}`,
      metadata: { orderId, orderNumber },
    })
  } catch (err) {
    logger.warn("notification-service.order.cancelled", { error: String(err) })
  }
})

eventBus.on("payment.paid", "notification-service:payment.paid", async (event, db) => {
  try {
    const { paymentId, orderId, amount, method } = event.payload
    await notificationRepository.create(db, {
      storeId: event.storeId,
      type: "PAYMENT_RECEIVED",
      title: "Pagamento recebido",
      body: `${cents(amount)} · ${PAYMENT_METHOD[method] ?? method}`,
      link: `/orders/${orderId}`,
      metadata: { paymentId, orderId, amount },
    })
  } catch (err) {
    logger.warn("notification-service.payment.paid", { error: String(err) })
  }
})

eventBus.on("payment.refunded", "notification-service:payment.refunded", async (event, db) => {
  try {
    const { paymentId, orderId, refundedAmount, isFullRefund } = event.payload
    await notificationRepository.create(db, {
      storeId: event.storeId,
      type: "PAYMENT_REFUNDED",
      title: isFullRefund ? "Reembolso total processado" : "Reembolso parcial processado",
      body: `${cents(refundedAmount)} devolvidos`,
      link: `/orders/${orderId}`,
      metadata: { paymentId, orderId, refundedAmount },
    })
  } catch (err) {
    logger.warn("notification-service.payment.refunded", { error: String(err) })
  }
})

eventBus.on("delivery.failed", "notification-service:delivery.failed", async (event, db) => {
  try {
    const { deliveryId, orderId, failedReason } = event.payload
    await notificationRepository.create(db, {
      storeId: event.storeId,
      type: "DELIVERY_FAILED",
      title: "Entrega falhou",
      body: failedReason ?? "A entrega não pôde ser concluída.",
      link: `/delivery`,
      metadata: { deliveryId, orderId },
    })
  } catch (err) {
    logger.warn("notification-service.delivery.failed", { error: String(err) })
  }
})

eventBus.on("stock.low", "notification-service:stock.low", async (event, db) => {
  try {
    const { ingredientId, ingredientName, currentStock, minStock, unit } = event.payload
    await notificationRepository.create(db, {
      storeId: event.storeId,
      type: "STOCK_LOW",
      title: "Estoque baixo",
      body: `${ingredientName}: ${currentStock} ${unit} (mín. ${minStock} ${unit})`,
      link: `/inventory`,
      metadata: { ingredientId, ingredientName, currentStock, minStock },
    })
  } catch (err) {
    logger.warn("notification-service.stock.low", { error: String(err) })
  }
})

eventBus.on("kitchen_ticket.ready", "notification-service:kitchen_ticket.ready", async (event, db) => {
  try {
    const { ticketId, orderId, orderNumber, orderType } = event.payload
    const label =
      orderType === "DELIVERY" ? "pronto para sair" :
      orderType === "TAKEAWAY" ? "pronto para retirada" : "pronto"
    await notificationRepository.create(db, {
      storeId: event.storeId,
      type: "KITCHEN_READY",
      title: `Pedido #${orderNumber} ${label}`,
      body: "Ticket da cozinha marcado como pronto.",
      link: `/orders/${orderId}`,
      metadata: { ticketId, orderId, orderNumber },
    })
  } catch (err) {
    logger.warn("notification-service.kitchen.ready", { error: String(err) })
  }
})

export const notificationService = {
  list: notificationRepository.list.bind(notificationRepository),
  countUnread: notificationRepository.countUnread.bind(notificationRepository),
  markRead: notificationRepository.markRead.bind(notificationRepository),
  markAllRead: notificationRepository.markAllRead.bind(notificationRepository),
  delete: notificationRepository.delete.bind(notificationRepository),
}
