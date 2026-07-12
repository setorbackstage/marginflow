import "server-only"
import type { NextRequest } from "next/server"
import { prisma } from "@/server/db"
import { authorizationService } from "@/server/services"
import { pushSubscriptionRepository } from "@/server/repositories"
import { requireAuth, requireUuidParams, NotFoundError, ForbiddenError } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, noContent } from "@/server/lib/http"

interface RouteContext {
  params: Promise<{ storeId: string; subscriptionId: string }>
}

async function handleUnsubscribe(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, subscriptionId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "orders:view")

  const subs = await pushSubscriptionRepository.findByUser(prisma, actor.userId)
  const target = subs.find((s) => s.id === subscriptionId)
  if (!target) throw new NotFoundError("NOT_FOUND", "Subscription not found")
  if (target.storeId !== storeId) throw new ForbiddenError("FORBIDDEN", "Access denied")

  await pushSubscriptionRepository.delete(prisma, subscriptionId)
  return noContent()
}

export const DELETE = compose(withRequestContext, withErrorHandling)(handleUnsubscribe)
