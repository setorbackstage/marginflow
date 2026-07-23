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
  groupBy:  z.enum(["day", "hour"]).default("day"),
})

async function handleReportsSales(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "reports:view")

  const { dateFrom, dateTo, groupBy } = parseQuery(request.nextUrl.searchParams, querySchema)

  const from = new Date(`${dateFrom}T00:00:00.000Z`)
  const to   = new Date(`${dateTo}T23:59:59.999Z`)

  const orders = await prisma.order.findMany({
    where: {
      storeId,
      status:    { not: "CANCELLED" },
      createdAt: { gte: from, lte: to },
    },
    select: {
      grandTotal: true,
      createdAt:  true,
    },
  })

  // ─── Group by day or hour ────────────────────────────────────────────
  const bucketMap = new Map<string, { revenue: number; orderCount: number }>()

  // Pre-populate all buckets in range
  if (groupBy === "day") {
    const cur = new Date(from)
    while (cur <= to) {
      bucketMap.set(cur.toISOString().slice(0, 10), { revenue: 0, orderCount: 0 })
      cur.setUTCDate(cur.getUTCDate() + 1)
    }
  } else {
    // hour — populate hours in the requested range
    const cur = new Date(from)
    while (cur <= to) {
      const key = cur.toISOString().slice(0, 13) + ":00" // "2025-07-01T14:00"
      bucketMap.set(key, { revenue: 0, orderCount: 0 })
      cur.setUTCHours(cur.getUTCHours() + 1)
    }
  }

  for (const order of orders) {
    const key =
      groupBy === "day"
        ? order.createdAt.toISOString().slice(0, 10)
        : order.createdAt.toISOString().slice(0, 13) + ":00"
    const entry = bucketMap.get(key) ?? { revenue: 0, orderCount: 0 }
    entry.revenue    += order.grandTotal
    entry.orderCount += 1
    bucketMap.set(key, entry)
  }

  const series = Array.from(bucketMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({
      date,
      revenue:           v.revenue,
      orderCount:        v.orderCount,
      averageOrderValue: v.orderCount > 0 ? Math.round(v.revenue / v.orderCount) : 0,
    }))

  const totals = {
    revenue:    series.reduce((s, d) => s + d.revenue, 0),
    orderCount: series.reduce((s, d) => s + d.orderCount, 0),
  }

  return ok({ groupBy, series, totals })
}

export const GET = compose(withRequestContext, withErrorHandling)(handleReportsSales)
