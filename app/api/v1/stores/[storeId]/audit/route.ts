import "server-only"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/server/db"
import { authorizationService } from "@/server/services"
import { auditLogRepository } from "@/server/repositories"
import { requireAuth, parseQuery, requireUuidParams } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, paginated, buildPaginationMeta } from "@/server/lib/http"

interface RouteContext {
  params: Promise<{ storeId: string }>
}

const auditQuerySchema = z.object({
  page:       z.coerce.number().int().min(1).default(1),
  limit:      z.coerce.number().int().min(1).max(200).default(50),
  action:     z.string().optional(),
  entityType: z.string().optional(),
  from:       z.string().optional(),
  to:         z.string().optional(),
})

async function handleListAuditLogs(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "reports:view")

  const query = parseQuery(request.nextUrl.searchParams, auditQuerySchema)

  const { items, total } = await auditLogRepository.findMany(prisma, storeId, {
    page:       query.page,
    limit:      query.limit,
    action:     query.action,
    entityType: query.entityType,
    from:       query.from ? new Date(query.from) : undefined,
    to:         query.to   ? new Date(query.to)   : undefined,
  })

  const mapped = items.map((log) => ({
    id:         log.id,
    action:     log.action,
    entityType: log.entityType,
    entityId:   log.entityId,
    entityRef:  log.entityRef,
    meta:       log.meta,
    createdAt:  log.createdAt,
    user: log.user
      ? { id: log.user.id, name: log.user.name, email: log.user.email }
      : null,
  }))

  return paginated(mapped, buildPaginationMeta(query.page, query.limit, total))
}

export const GET = compose(withRequestContext, withErrorHandling)(handleListAuditLogs)
