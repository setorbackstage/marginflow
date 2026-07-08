import "server-only"
import type { NextRequest } from "next/server"
import { prisma } from "@/server/db"
import { orderService, userService, authorizationService } from "@/server/services"
import { requireAuth, requireUuidParams } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok } from "@/server/lib/http"
import { getOrderWithDetailsOrThrow } from "../../_order-response"

interface RouteContext {
  params: Promise<{ storeId: string; orderId: string }>
}

async function handleGetTimeline(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, orderId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "orders:view")

  // Confirms the order belongs to this store (Store Isolation).
  await getOrderWithDetailsOrThrow(storeId, orderId)

  const transitions = await orderService.getTimeline(prisma, orderId)
  const userIds = [...new Set(transitions.map((t) => t.triggeredByUserId).filter((id): id is string => id !== null))]
  const users = await Promise.all(userIds.map((id) => userService.findById(prisma, id)))
  const userById = new Map(users.filter((u) => u !== null).map((u) => [u.id, u]))

  // Transitions are ordered newest-first (desc). Reverse to compute fromStatus
  // (each transition's from = the previous transition's status chronologically).
  const chronological = [...transitions].reverse()

  return ok(
    chronological
      .map((transition, index) => {
        const triggeredByUser = transition.triggeredByUserId
          ? (userById.get(transition.triggeredByUserId) ?? null)
          : null
        return {
          id: transition.id,
          fromStatus: index > 0 ? chronological[index - 1].status : null,
          status: transition.status,
          triggeredByUser: triggeredByUser ? { id: triggeredByUser.id, name: triggeredByUser.name } : null,
          notes: transition.notes,
          occurredAt: transition.occurredAt,
        }
      })
      .reverse(), // restore newest-first for the response
  )
}

export const GET = compose(withRequestContext, withErrorHandling)(handleGetTimeline)
