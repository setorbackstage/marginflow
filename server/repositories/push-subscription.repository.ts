import "server-only"
import type { Prisma, PushSubscription } from "@/generated/prisma/client"

export const pushSubscriptionRepository = {
  async upsert(
    db: Prisma.TransactionClient,
    data: { storeId: string; userId: string; endpoint: string; p256dh: string; auth: string },
  ) {
    return db.pushSubscription.upsert({
      where:  { userId_endpoint: { userId: data.userId, endpoint: data.endpoint } },
      create: data,
      update: { p256dh: data.p256dh, auth: data.auth },
    })
  },

  async findByStore(db: Prisma.TransactionClient, storeId: string): Promise<PushSubscription[]> {
    return db.pushSubscription.findMany({ where: { storeId } })
  },

  async delete(db: Prisma.TransactionClient, id: string): Promise<PushSubscription> {
    return db.pushSubscription.delete({ where: { id } })
  },

  async deleteExpired(db: Prisma.TransactionClient, id: string): Promise<void> {
    await db.pushSubscription.delete({ where: { id } }).catch(() => {})
  },

  async findByUser(db: Prisma.TransactionClient, userId: string): Promise<PushSubscription[]> {
    return db.pushSubscription.findMany({ where: { userId } })
  },
}
