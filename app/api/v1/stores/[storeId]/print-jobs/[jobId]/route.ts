import "server-only"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/server/db"
import { authorizationService } from "@/server/services"
import { printJobService } from "@/server/printing"
import { requireAuth, parseJsonBody, requireUuidParams, logAudit } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok } from "@/server/lib/http"

interface RouteContext {
  params: Promise<{ storeId: string; jobId: string }>
}

const updatePrintJobSchema = z.object({
  action: z.enum(["retry", "cancel", "complete", "fail"]),
  error:  z.string().optional(),
})

async function handleGetPrintJob(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, jobId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "settings:view")

  const job = await printJobService.getById(prisma, storeId, jobId)
  return ok(job)
}

async function handleUpdatePrintJob(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, jobId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "settings:edit")

  const body = await parseJsonBody(request, updatePrintJobSchema)

  let job
  switch (body.action) {
    case "retry":
      job = await printJobService.retry(prisma, storeId, jobId)
      break
    case "cancel":
      job = await printJobService.cancel(prisma, storeId, jobId)
      break
    case "complete":
      job = await printJobService.updateStatus(prisma, storeId, jobId, "PRINTED")
      break
    case "fail":
      job = await printJobService.updateStatus(prisma, storeId, jobId, "ERROR", body.error)
      break
  }

  void logAudit(prisma, { storeId, userId: actor.userId, action: `print_job.${body.action}`, entityType: "PrintJob", entityId: jobId })
  return ok(job)
}

export const GET   = compose(withRequestContext, withErrorHandling)(handleGetPrintJob)
export const PATCH = compose(withRequestContext, withErrorHandling)(handleUpdatePrintJob)
