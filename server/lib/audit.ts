import "server-only"
import type { DbClient } from "../db"
import { auditLogRepository, type AuditLogCreateInput } from "../repositories"

/**
 * Fire-and-forget audit logger. Never throws — failures are silently swallowed
 * so they never block or fail the parent request.
 *
 * Usage:
 *   void logAudit(prisma, { storeId, userId: actor.userId, action: "product.deleted", entityType: "Product", entityId: product.id, entityRef: product.name })
 */
export function logAudit(db: DbClient, data: AuditLogCreateInput): void {
  auditLogRepository.create(db, data).catch(() => {
    // Intentionally swallowed — audit failures must never break business logic
  })
}
