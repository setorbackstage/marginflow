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
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).default(() => {
    const d = new Date()
    d.setDate(d.getDate() - 29)
    return d.toISOString().slice(0, 10)
  }),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).default(() => new Date().toISOString().slice(0, 10)),
})

async function handleReportsOverview(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "reports:view")

  const { dateFrom, dateTo } = parseQuery(request.nextUrl.searchParams, querySchema)

  // Build UTC date range boundaries
  const from = new Date(`${dateFrom}T00:00:00.000Z`)
  const to   = new Date(`${dateTo}T23:59:59.999Z`)

  // Run all aggregations in parallel
  const [orders, payments, topProductsRaw] = await Promise.all([
    // All non-cancelled orders in range with items
    prisma.order.findMany({
      where: {
        storeId,
        status: { not: "CANCELLED" },
        createdAt: { gte: from, lte: to },
      },
      select: {
        id:         true,
        channel:    true,
        grandTotal: true,
        createdAt:  true,
      },
    }),

    // Paid payments in range
    prisma.payment.findMany({
      where: {
        storeId,
        status: { in: ["PAID", "PARTIALLY_REFUNDED"] },
        paidAt: { gte: from, lte: to },
      },
      select: {
        method: true,
        amount: true,
      },
    }),

    // Top products by revenue (via order items)
    prisma.orderItem.findMany({
      where: {
        order: {
          storeId,
          status: { not: "CANCELLED" },
          createdAt: { gte: from, lte: to },
        },
        status: { not: "CANCELLED" },
      },
      select: {
        productId:   true,
        productName: true,
        quantity:    true,
        subtotal:    true,
      },
    }),
  ])

  // ─── Revenue by day ──────────────────────────────────────────────────────
  const dayMap = new Map<string, { revenue: number; orders: number }>()
  // Pre-populate all days in range
  const cur = new Date(from)
  while (cur <= to) {
    dayMap.set(cur.toISOString().slice(0, 10), { revenue: 0, orders: 0 })
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  for (const order of orders) {
    const day = order.createdAt.toISOString().slice(0, 10)
    const entry = dayMap.get(day) ?? { revenue: 0, orders: 0 }
    entry.revenue += order.grandTotal
    entry.orders  += 1
    dayMap.set(day, entry)
  }
  const revenueByDay = Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }))

  // ─── By channel ─────────────────────────────────────────────────────────
  const channelMap = new Map<string, { orders: number; revenue: number }>()
  for (const order of orders) {
    const entry = channelMap.get(order.channel) ?? { orders: 0, revenue: 0 }
    entry.orders  += 1
    entry.revenue += order.grandTotal
    channelMap.set(order.channel, entry)
  }
  const byChannel = Array.from(channelMap.entries())
    .map(([channel, v]) => ({ channel, ...v }))
    .sort((a, b) => b.revenue - a.revenue)

  // ─── By payment method ───────────────────────────────────────────────────
  const methodMap = new Map<string, { count: number; total: number }>()
  for (const payment of payments) {
    const entry = methodMap.get(payment.method) ?? { count: 0, total: 0 }
    entry.count += 1
    entry.total += payment.amount
    methodMap.set(payment.method, entry)
  }
  const byPaymentMethod = Array.from(methodMap.entries())
    .map(([method, v]) => ({ method, ...v }))
    .sort((a, b) => b.total - a.total)

  // ─── Top products ────────────────────────────────────────────────────────
  const productMap = new Map<string, { name: string; quantity: number; revenue: number }>()
  for (const item of topProductsRaw) {
    const key = item.productId ?? item.productName
    const entry = productMap.get(key) ?? { name: item.productName, quantity: 0, revenue: 0 }
    entry.quantity += item.quantity
    entry.revenue  += item.subtotal
    productMap.set(key, entry)
  }
  const topProducts = Array.from(productMap.entries())
    .map(([productId, v]) => ({ productId, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)

  // ─── Summary ─────────────────────────────────────────────────────────────
  const totalRevenue = orders.reduce((s, o) => s + o.grandTotal, 0)
  const totalOrders  = orders.length
  const averageTicket = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0

  const newCustomers = await prisma.customer.count({
    where: { storeId, createdAt: { gte: from, lte: to } },
  })

  return ok({
    summary: { totalRevenue, totalOrders, averageTicket, newCustomers },
    revenueByDay,
    byChannel,
    byPaymentMethod,
    topProducts,
  })
}

export const GET = compose(withRequestContext, withErrorHandling)(handleReportsOverview)
