import "server-only"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/server/db"
import { authorizationService } from "@/server/services"
import { pushSubscriptionRepository } from "@/server/repositories"
import { requireAuth, parseJsonBody, requireUuidParams } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok, created } from "@/server/lib/http"

interface RouteContext {
  params: Promise<{ storeId: string }>
}

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  p256dh:   z.string().min(1),
  auth:     z.string().min(1),
})

/** POST — register or refresh a push subscription for the current user */
async function handleSubscribe(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "orders:view")

  const body = await parseJsonBody(request, subscribeSchema)
  const sub = await pushSubscriptionRepository.upsert(prisma, {
    storeId,
    userId: actor.userId,
    ...body,
  })
  return created({ id: sub.id })
}

/** GET — check if user has a push subscription for this store */
async function handleGetStatus(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "orders:view")

  const subs = await pushSubscriptionRepository.findByUser(prisma, actor.userId)
  return ok({ subscribed: subs.length > 0, count: subs.length })
}

export const POST = compose(withRequestContext, withErrorHandling)(handleSubscribe)
export const GET  = compose(withRequestContext, withErrorHandling)(handleGetStatus)
