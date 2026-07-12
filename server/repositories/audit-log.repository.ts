import "server-only"
import type { DbClient } from "../db"
import { Prisma } from "../../generated/prisma/client"

export interface AuditLogCreateInput {
  storeId:    string
  userId?:    string | null
  action:     string
  entityType: string
  entityId?:  string | null
  entityRef?: string | null
  meta?:      Prisma.InputJsonValue | null
}

export interface AuditLogFindManyOptions {
  page?:       number
  limit?:      number
  action?:     string
  entityType?: string
  from?:       Date
  to?:         Date
}

/**
 * Pure data access for the `audit_logs` table. Append-only —
 * there is no update or delete method.
 */
export const auditLogRepository = {
  create(db: DbClient, data: AuditLogCreateInput) {
    return db.auditLog.create({
      data: {
        storeId:    data.storeId,
        userId:     data.userId ?? undefined,
        action:     data.action,
        entityType: data.entityType,
        entityId:   data.entityId ?? undefined,
        entityRef:  data.entityRef ?? undefined,
        // Prisma nullable JSON requires explicit NullableJsonNullValueInput for null
        meta: data.meta === null ? Prisma.JsonNull : (data.meta ?? undefined),
      },
    })
  },

  async findMany(db: DbClient, storeId: string, opts: AuditLogFindManyOptions = {}) {
    const { page = 1, limit = 50, action, entityType, from, to } = opts
    const where: Prisma.AuditLogWhereInput = {
      storeId,
      ...(action     ? { action }     : {}),
      ...(entityType ? { entityType } : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: from } : {}),
              ...(to   ? { lte: to   } : {}),
            },
          }
        : {}),
    }

    const [items, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip:    (page - 1) * limit,
        take:    limit,
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      db.auditLog.count({ where }),
    ])

    return { items, total }
  },
}
