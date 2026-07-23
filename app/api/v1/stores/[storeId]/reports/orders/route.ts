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

async function handleReportsOrders(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "reports:view")

  const { dateFrom, dateTo } = parseQuery(request.nextUrl.searchParams, querySchema)

  const from = new Date(`${dateFrom}T00:00:00.000Z`)
  const to   = new Date(`${dateTo}T23:59:59.999Z`)

  const orders = await prisma.order.findMany({
    where: { storeId, createdAt: { gte: from, lte: to } },
    select: {
      status:       true,
      type:         true,
      channel:      true,
      grandTotal:   true,
      confirmedAt:  true,
      readyAt:      true,
      delivery: {
        select: { dispatchedAt: true, deliveredAt: true },
      },
    },
  })

  const total = orders.length

  // ─── By type ─────────────────────────────────────────────────────────
  const byType: Record<string, { count: number; revenue: number }> = {}
  for (const o of orders) {
    if (o.status === "CANCELLED") continue
    const entry = byType[o.type] ?? { count: 0, revenue: 0 }
    entry.count   += 1
    entry.revenue += o.grandTotal
    byType[o.type] = entry
  }

  // ─── By channel ───────────────────────────────────────────────────────
  const byChannel: Record<string, { count: number; revenue: number }> = {}
  for (const o of orders) {
    if (o.status === "CANCELLED") continue
    const entry = byChannel[o.channel] ?? { count: 0, revenue: 0 }
    entry.count   += 1
    entry.revenue += o.grandTotal
    byChannel[o.channel] = entry
  }

  // ─── Cancellation rate ───────────────────────────────────────────────
  const cancelled = orders.filter((o) => o.status === "CANCELLED").length
  const cancellationRate = total > 0 ? parseFloat(((cancelled / total) * 100).toFixed(2)) : 0

  // ─── Average prep time (CONFIRMED → READY) ────────────────────────────
  const prepMins: number[] = []
  for (const o of orders) {
    if (o.confirmedAt && o.readyAt) {
      prepMins.push((o.readyAt.getTime() - o.confirmedAt.getTime()) / 60_000)
    }
  }
  const averagePreparationMinutes =
    prepMins.length > 0
      ? parseFloat((prepMins.reduce((a, b) => a + b, 0) / prepMins.length).toFixed(1))
      : null

  // ─── Average delivery time (dispatched → delivered) ───────────────────
  const delMins: number[] = []
  for (const o of orders) {
    if (o.delivery?.dispatchedAt && o.delivery?.deliveredAt) {
      delMins.push((o.delivery.deliveredAt.getTime() - o.delivery.dispatchedAt.getTime()) / 60_000)
    }
  }
  const averageDeliveryMinutes =
    delMins.length > 0
      ? parseFloat((delMins.reduce((a, b) => a + b, 0) / delMins.length).toFixed(1))
      : null

  return ok({
    byType,
    byChannel,
    cancellationRate,
    averagePreparationMinutes,
    averageDeliveryMinutes,
  })
}

export const GET = compose(withRequestContext, withErrorHandling)(handleReportsOrders)
