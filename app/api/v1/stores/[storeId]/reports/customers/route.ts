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

async function handleReportsCustomers(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "reports:view")

  const { dateFrom, dateTo } = parseQuery(request.nextUrl.searchParams, querySchema)

  const from = new Date(`${dateFrom}T00:00:00.000Z`)
  const to   = new Date(`${dateTo}T23:59:59.999Z`)

  const [totalActive, newInPeriod, ordersInPeriod] = await Promise.all([
    // All customers ever in this store
    prisma.customer.count({ where: { storeId } }),

    // Customers created within the date range
    prisma.customer.count({ where: { storeId, createdAt: { gte: from, lte: to } } }),

    // Non-cancelled orders in range that have a customer
    prisma.order.findMany({
      where: {
        storeId,
        status:     { not: "CANCELLED" },
        createdAt:  { gte: from, lte: to },
        customerId: { not: null },
      },
      select: {
        customerId:   true,
        grandTotal:   true,
        customer: {
          select: { id: true, name: true },
        },
      },
    }),
  ])

  // ─── Returning vs new in period ───────────────────────────────────────
  const customerOrderCount = new Map<string, { name: string; orderCount: number; totalSpent: number }>()
  for (const order of ordersInPeriod) {
    if (!order.customerId) continue
    const entry = customerOrderCount.get(order.customerId) ?? {
      name:       order.customer?.name ?? "—",
      orderCount: 0,
      totalSpent: 0,
    }
    entry.orderCount += 1
    entry.totalSpent += order.grandTotal
    customerOrderCount.set(order.customerId, entry)
  }

  const uniqueCustomersInPeriod = customerOrderCount.size
  const returningInPeriod = Array.from(customerOrderCount.values()).filter((c) => c.orderCount > 1).length

  // ─── Repeat purchase rate ─────────────────────────────────────────────
  const repeatPurchaseRate =
    uniqueCustomersInPeriod > 0
      ? parseFloat(((returningInPeriod / uniqueCustomersInPeriod) * 100).toFixed(1))
      : 0

  // ─── Top customers by total spent ─────────────────────────────────────
  const topCustomers = Array.from(customerOrderCount.entries())
    .map(([customerId, v]) => ({
      customerId,
      name:       v.name,
      orderCount: v.orderCount,
      totalSpent: v.totalSpent,
    }))
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 10)

  return ok({
    totalActive,
    newInPeriod,
    returningInPeriod,
    repeatPurchaseRate,
    topCustomers,
  })
}

export const GET = compose(withRequestContext, withErrorHandling)(handleReportsCustomers)
