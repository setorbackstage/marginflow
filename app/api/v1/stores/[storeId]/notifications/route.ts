import "server-only"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/server/db"
import { notificationService, authorizationService } from "@/server/services"
import { requireAuth, parseQuery, requireUuidParams } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok } from "@/server/lib/http"

interface RouteContext {
  params: Promise<{ storeId: string }>
}

const listSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  page: z.coerce.number().int().min(1).default(1),
})

async function handleList(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "orders:view")

  const query = parseQuery(request.nextUrl.searchParams, listSchema)
  const result = await notificationService.list(prisma, storeId, query)

  const unread = await notificationService.countUnread(prisma, storeId)

  return ok({ ...result, unread })
}

export const GET = compose(withRequestContext, withErrorHandling)(handleList)
