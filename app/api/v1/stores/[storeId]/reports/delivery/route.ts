import "server-only"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/server/db"
import { authorizationService } from "@/server/services"
import { requireAuth, parseQuery, requireUuidParams } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok } from "@/server/lib/http"

interface RouteContext {
  params: Promise<{ storeId: string }>
}

const querySchema = z.object({
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dateTo:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

async function handleReportsDelivery(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "reports:view")

  const { dateFrom, dateTo } = parseQuery(request.nextUrl.searchParams, querySchema)

  const from = new Date(`${dateFrom}T00:00:00.000Z`)
  const to   = new Date(`${dateTo}T23:59:59.999Z`)

  const deliveries = await prisma.delivery.findMany({
    where: { storeId, createdAt: { gte: from, lte: to } },
    select: {
      status:      true,
      platform:    true,
      dispatchedAt: true,
      deliveredAt:  true,
      createdAt:    true,
      order: {
        select: { confirmedAt: true },
      },
    },
  })

  const total     = deliveries.length
  const delivered = deliveries.filter((d) => d.status === "DELIVERED").length
  const failed    = deliveries.filter((d) => d.status === "FAILED").length
  const returned  = deliveries.filter((d) => d.status === "RETURNED").length

  const successRate =
    total > 0 ? parseFloat(((delivered / total) * 100).toFixed(1)) : 0

  // ─── Average dispatch time (created → dispatched) ─────────────────────
  const dispatchMins: number[] = []
  for (const d of deliveries) {
    if (d.createdAt && d.dispatchedAt) {
      dispatchMins.push((d.dispatchedAt.getTime() - d.createdAt.getTime()) / 60_000)
    }
  }
  const averageDispatchMinutes =
    dispatchMins.length > 0
      ? parseFloat((dispatchMins.reduce((a, b) => a + b, 0) / dispatchMins.length).toFixed(1))
      : null

  // ─── Average delivery time (dispatched → delivered) ───────────────────
  const delMins: number[] = []
  for (const d of deliveries) {
    if (d.dispatchedAt && d.deliveredAt) {
      delMins.push((d.deliveredAt.getTime() - d.dispatchedAt.getTime()) / 60_000)
    }
  }
  const averageDeliveryMinutes =
    delMins.length > 0
      ? parseFloat((delMins.reduce((a, b) => a + b, 0) / delMins.length).toFixed(1))
      : null

  // ─── By platform ──────────────────────────────────────────────────────
  const platformMap = new Map<string, { count: number; delivered: number }>()
  for (const d of deliveries) {
    const key = d.platform ?? "INTERNAL"
    const entry = platformMap.get(key) ?? { count: 0, delivered: 0 }
    entry.count += 1
    if (d.status === "DELIVERED") entry.delivered += 1
    platformMap.set(key, entry)
  }
  const byPlatform: Record<string, { count: number; successRate: number }> = {}
  for (const [platform, v] of platformMap.entries()) {
    byPlatform[platform] = {
      count:       v.count,
      successRate: v.count > 0 ? parseFloat(((v.delivered / v.count) * 100).toFixed(1)) : 0,
    }
  }

  return ok({
    totalDeliveries: total,
    delivered,
    failed,
    returned,
    successRate,
    averageDispatchMinutes,
    averageDeliveryMinutes,
    byPlatform,
  })
}

export const GET = compose(withRequestContext, withErrorHandling)(handleReportsDelivery)
