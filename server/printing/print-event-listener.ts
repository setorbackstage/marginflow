import "server-only"
import { eventBus } from "@/server/lib"
import { printJobService } from "@/server/printing"
import { logger } from "@/server/lib/logger"

eventBus.on("order.created", "print-listener:order.created", async (event, db) => {
  try {
    const { orderId } = event.payload
    await printJobService.createFromEvent(db, event.storeId, "order.created", orderId)
  } catch (err) {
    logger.warn("print-listener.order.created", { error: String(err) })
  }
})

eventBus.on("order.confirmed", "print-listener:order.confirmed", async (event, db) => {
  try {
    const { orderId } = event.payload
    await printJobService.createFromEvent(db, event.storeId, "order.confirmed", orderId)
  } catch (err) {
    logger.warn("print-listener.order.confirmed", { error: String(err) })
  }
})

eventBus.on("kitchen_ticket.created", "print-listener:kitchen_ticket.created", async (event, db) => {
  try {
    const { orderId } = event.payload
    await printJobService.createFromEvent(db, event.storeId, "kitchen_ticket.created", orderId)
  } catch (err) {
    logger.warn("print-listener.kitchen_ticket.created", { error: String(err) })
  }
})
