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
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

async function handleDashboard(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "store:view")

  const storeRecord = await prisma.store.findUnique({ where: { id: storeId }, select: { timezone: true } })

  const { date } = parseQuery(request.nextUrl.searchParams, querySchema)
  const targetDate = date ?? new Date().toISOString().slice(0, 10)

  const from = new Date(`${targetDate}T00:00:00.000Z`)
  const to   = new Date(`${targetDate}T23:59:59.999Z`)

  // Fetch all data in parallel
  const [orders, topProductsRaw, lowStockCount, cmvRaw] = await Promise.all([
    prisma.order.findMany({
      where: { storeId, createdAt: { gte: from, lte: to } },
      select: {
        id:          true,
        number:      true,
        status:      true,
        type:        true,
        channel:     true,
        grandTotal:  true,
        discountTotal: true,
        deliveryFee: true,
        customerName: true,
        createdAt:   true,
        confirmedAt: true,
        readyAt:     true,
        deliveredAt: true,
        kitchenTicket: {
          select: { startedAt: true, readyAt: true },
        },
        delivery: {
          select: { dispatchedAt: true, deliveredAt: true },
        },
      },
    }),

    // Top products by quantity sold today
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

    // Low stock count (field-to-field comparison: currentStock <= minStock)
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint AS count
      FROM ingredients
      WHERE store_id = ${storeId}::uuid
        AND deleted_at IS NULL
        AND min_stock IS NOT NULL
        AND current_stock <= min_stock
    `.then((rows) => Number(rows[0]?.count ?? 0)).catch(() => 0),

    // CMV: SALE_CONSUMPTION minus SALE_REVERSAL for the day
    prisma.stockMovement.findMany({
      where: {
        storeId,
        type: { in: ["SALE_CONSUMPTION", "SALE_REVERSAL"] },
        createdAt: { gte: from, lte: to },
      },
      select: {
        type:         true,
        quantityDelta: true,
        unitCost:     true,
      },
    }).catch(() => []),
  ])

  // ─── Order status breakdown ────────────────────────────────────────────
  const ordersByStatus: Record<string, number> = {}
  for (const o of orders) {
    ordersByStatus[o.status] = (ordersByStatus[o.status] ?? 0) + 1
  }

  const nonCancelled = orders.filter((o) => o.status !== "CANCELLED")
  const grossRevenue   = nonCancelled.reduce((s, o) => s + o.grandTotal, 0)
  const discounts      = nonCancelled.reduce((s, o) => s + o.discountTotal, 0)
  const deliveryFees   = nonCancelled.reduce((s, o) => s + o.deliveryFee, 0)
  const netRevenue     = grossRevenue - discounts + deliveryFees

  // ─── Average preparation time (CONFIRMED → READY) ─────────────────────
  const prepMins: number[] = []
  for (const o of nonCancelled) {
    if (o.confirmedAt && o.readyAt) {
      prepMins.push((o.readyAt.getTime() - o.confirmedAt.getTime()) / 60_000)
    }
  }
  const averagePreparationMinutes =
    prepMins.length > 0 ? Math.round(prepMins.reduce((a, b) => a + b, 0) / prepMins.length) : null

  // ─── Average delivery time (dispatched → delivered) ────────────────────
  const delMins: number[] = []
  for (const o of nonCancelled) {
    if (o.delivery?.dispatchedAt && o.delivery?.deliveredAt) {
      delMins.push((o.delivery.deliveredAt.getTime() - o.delivery.dispatchedAt.getTime()) / 60_000)
    }
  }
  const averageDeliveryMinutes =
    delMins.length > 0 ? Math.round(delMins.reduce((a, b) => a + b, 0) / delMins.length) : null

  // ─── Top products ─────────────────────────────────────────────────────
  const productMap = new Map<string, { productName: string; quantitySold: number; revenue: number }>()
  for (const item of topProductsRaw) {
    const key = item.productId ?? item.productName
    const entry = productMap.get(key) ?? { productName: item.productName, quantitySold: 0, revenue: 0 }
    entry.quantitySold += item.quantity
    entry.revenue      += item.subtotal
    productMap.set(key, entry)
  }
  const topProducts = Array.from(productMap.entries())
    .map(([productId, v]) => ({ productId, ...v }))
    .sort((a, b) => b.quantitySold - a.quantitySold)
    .slice(0, 10)

  // ─── Active orders (non-terminal statuses) ────────────────────────────
  const ACTIVE_STATUSES = new Set(["PENDING", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY"])
  const activeOrders = orders
    .filter((o) => ACTIVE_STATUSES.has(o.status))
    .map((o) => ({
      orderId:      o.id,
      number:       o.number,
      status:       o.status,
      type:         o.type,
      customerName: o.customerName ?? null,
      grandTotal:   o.grandTotal,
      createdAt:    o.createdAt.toISOString(),
    }))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  // ─── Inventory CMV ───────────────────────────────────────────────────
  const hasIngredients = await prisma.ingredient.count({ where: { storeId, deletedAt: null } }).catch(() => 0)
  let cmv: number | null = null
  if (hasIngredients > 0) {
    cmv = (cmvRaw as Array<{ type: string; quantityDelta: unknown; unitCost: unknown }>)
      .reduce((sum, m) => {
        const qty  = Math.abs(Number(m.quantityDelta))
        const cost = qty * Number(m.unitCost ?? 0)
        return m.type === "SALE_CONSUMPTION" ? sum + cost : sum - cost
      }, 0)
    cmv = Math.max(0, Math.round(cmv))
  }

  const averageOrderValue =
    nonCancelled.length > 0 ? Math.round(grossRevenue / nonCancelled.length) : 0

  return ok({
    date:     targetDate,
    timezone: storeRecord?.timezone ?? "America/Sao_Paulo",
    orders: {
      total:          orders.length,
      pending:        ordersByStatus["PENDING"]          ?? 0,
      confirmed:      ordersByStatus["CONFIRMED"]        ?? 0,
      preparing:      ordersByStatus["PREPARING"]        ?? 0,
      ready:          ordersByStatus["READY"]            ?? 0,
      outForDelivery: ordersByStatus["OUT_FOR_DELIVERY"] ?? 0,
      delivered:      ordersByStatus["DELIVERED"]        ?? 0,
      cancelled:      ordersByStatus["CANCELLED"]        ?? 0,
    },
    revenue: {
      gross:        grossRevenue,
      discounts,
      deliveryFees,
      net:          netRevenue,
    },
    averageOrderValue,
    averagePreparationMinutes,
    averageDeliveryMinutes,
    topProducts,
    activeOrders,
    inventory: {
      lowStockCount,
      cmv,
    },
  })
}

export const GET = compose(withRequestContext, withErrorHandling)(handleDashboard)
