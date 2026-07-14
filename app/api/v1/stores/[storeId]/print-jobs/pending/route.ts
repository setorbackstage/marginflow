import "server-only"
import type { NextRequest } from "next/server"
import { prisma } from "@/server/db"
import { authorizationService } from "@/server/services"
import { printJobService } from "@/server/printing"
import { requireAuth, requireUuidParams } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok } from "@/server/lib/http"

interface RouteContext {
  params: Promise<{ storeId: string }>
}

async function handleListPendingJobs(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "settings:view")

  const jobs = await printJobService.listPending(prisma, storeId)
  return ok(jobs)
}

export const GET = compose(withRequestContext, withErrorHandling)(handleListPendingJobs)
