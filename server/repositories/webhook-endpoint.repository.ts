import "server-only"
import type { DbClient } from "../db"
import type { WebhookEndpoint, Prisma } from "../../generated/prisma/client"

export const webhookEndpointRepository = {
  findById(db: DbClient, id: string): Promise<WebhookEndpoint | null> {
    return db.webhookEndpoint.findUnique({ where: { id } })
  },

  findByStore(db: DbClient, storeId: string): Promise<WebhookEndpoint[]> {
    return db.webhookEndpoint.findMany({
      where: { storeId },
      orderBy: { createdAt: "desc" },
    })
  },

  /** Returns only active endpoints that subscribe to the given event type. */
  findActiveForEvent(db: DbClient, storeId: string, eventType: string): Promise<WebhookEndpoint[]> {
    return db.webhookEndpoint.findMany({
      where: {
        storeId,
        isActive: true,
        OR: [
          { events: { isEmpty: true } },
          { events: { has: eventType } },
        ],
      },
    })
  },

  create(db: DbClient, data: Prisma.WebhookEndpointCreateInput): Promise<WebhookEndpoint> {
    return db.webhookEndpoint.create({ data })
  },

  update(db: DbClient, id: string, data: Prisma.WebhookEndpointUpdateInput): Promise<WebhookEndpoint> {
    return db.webhookEndpoint.update({ where: { id }, data })
  },

  delete(db: DbClient, id: string): Promise<WebhookEndpoint> {
    return db.webhookEndpoint.delete({ where: { id } })
  },
}
