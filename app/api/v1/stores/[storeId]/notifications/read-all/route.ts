import "server-only"
import type { NextRequest } from "next/server"
import { prisma } from "@/server/db"
import { notificationService, authorizationService } from "@/server/services"
import { requireAuth, requireUuidParams } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok } from "@/server/lib/http"

interface RouteContext {
  params: Promise<{ storeId: string }>
}

async function handleReadAll(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "orders:view")

  const count = await notificationService.markAllRead(prisma, storeId)
  return ok({ marked: count })
}

export const POST = compose(withRequestContext, withErrorHandling)(handleReadAll)
