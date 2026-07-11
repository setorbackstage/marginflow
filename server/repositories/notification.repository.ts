import "server-only"
import type { Prisma } from "@/generated/prisma/client"

export interface NotificationCreateInput {
  storeId: string
  userId?: string | null
  type: string
  title: string
  body: string
  link?: string | null
  metadata?: Record<string, unknown>
}

export const notificationRepository = {
  async create(db: Prisma.TransactionClient, input: NotificationCreateInput) {
    return db.notification.create({
      data: {
        storeId: input.storeId,
        userId: input.userId ?? null,
        type: input.type,
        title: input.title,
        body: input.body,
        link: input.link ?? null,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
      },
    })
  },

  async list(
    db: Prisma.TransactionClient,
    storeId: string,
    options: { limit?: number; page?: number } = {},
  ) {
    const limit = Math.min(options.limit ?? 20, 50)
    const page = Math.max(options.page ?? 1, 1)
    const skip = (page - 1) * limit

    const [items, total] = await Promise.all([
      db.notification.findMany({
        where: { storeId },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
      }),
      db.notification.count({ where: { storeId } }),
    ])

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: skip + items.length < total,
        hasPreviousPage: page > 1,
      },
    }
  },

  async countUnread(db: Prisma.TransactionClient, storeId: string): Promise<number> {
    return db.notification.count({ where: { storeId, readAt: null } })
  },

  async markRead(db: Prisma.TransactionClient, id: string, storeId: string) {
    return db.notification
      .update({ where: { id, storeId }, data: { readAt: new Date() } })
      .catch(() => null)
  },

  async markAllRead(db: Prisma.TransactionClient, storeId: string): Promise<number> {
    const result = await db.notification.updateMany({
      where: { storeId, readAt: null },
      data: { readAt: new Date() },
    })
    return result.count
  },

  async delete(db: Prisma.TransactionClient, id: string, storeId: string): Promise<boolean> {
    const result = await db.notification.deleteMany({ where: { id, storeId } })
    return result.count > 0
  },
}
