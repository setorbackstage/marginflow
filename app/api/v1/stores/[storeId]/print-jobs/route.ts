import "server-only"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/server/db"
import { authorizationService } from "@/server/services"
import { printJobService } from "@/server/printing"
import { requireAuth, parseJsonBody, parseQuery, requireUuidParams, logAudit } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, paginated, buildPaginationMeta, created } from "@/server/lib/http"

interface RouteContext {
  params: Promise<{ storeId: string }>
}

const listPrintJobsQuerySchema = z.object({
  page:      z.coerce.number().int().min(1).default(1),
  limit:     z.coerce.number().int().min(1).max(200).default(50),
  printerId: z.string().uuid().optional(),
  status:    z.enum(["PENDING", "SENDING", "PRINTED", "ERROR", "CANCELLED"]).optional(),
  type:      z.enum(["ORDER", "RECEIPT", "CANCELLATION", "LABEL", "KITCHEN", "DELIVERY", "TEST"]).optional(),
  from:      z.string().optional(),
  to:        z.string().optional(),
})

const createPrintJobSchema = z.object({
  printerId:  z.string().uuid(),
  templateId: z.string().uuid().optional(),
  orderId:    z.string().uuid().optional(),
  type:       z.enum(["ORDER", "RECEIPT", "CANCELLATION", "LABEL", "KITCHEN", "DELIVERY", "TEST"]),
  content:    z.string().optional(),
})

async function handleListPrintJobs(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "settings:view")

  const query = parseQuery(request.nextUrl.searchParams, listPrintJobsQuerySchema)
  const { items, total } = await printJobService.list(prisma, storeId, {
    page:      query.page,
    limit:     query.limit,
    printerId: query.printerId,
    status:    query.status,
    type:      query.type,
    from:      query.from ? new Date(query.from) : undefined,
    to:        query.to   ? new Date(query.to)   : undefined,
  })

  return paginated(items, buildPaginationMeta(query.page, query.limit, total))
}

async function handleCreatePrintJob(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "settings:edit")

  const input = await parseJsonBody(request, createPrintJobSchema)
  const job = await printJobService.create(prisma, { storeId, ...input, status: "PENDING" })
  void logAudit(prisma, { storeId, userId: actor.userId, action: "print_job.created", entityType: "PrintJob", entityId: job.id, entityRef: job.type })
  return created(job)
}

export const GET  = compose(withRequestContext, withErrorHandling)(handleListPrintJobs)
export const POST = compose(withRequestContext, withErrorHandling)(handleCreatePrintJob)
