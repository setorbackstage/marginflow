import "server-only"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/server/db"
import { authorizationService } from "@/server/services"
import { requireAuth, parseQuery, requireUuidParams } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, paginated, buildPaginationMeta } from "@/server/lib/http"

interface RouteContext {
  params: Promise<{ storeId: string }>
}

const querySchema = z.object({
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dateTo:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  page:     z.coerce.number().int().min(1).default(1),
  limit:    z.coerce.number().int().min(1).max(100).default(20),
})

async function handleReportsProducts(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "reports:view")

  const { dateFrom, dateTo, page, limit } = parseQuery(request.nextUrl.searchParams, querySchema)

  const from = new Date(`${dateFrom}T00:00:00.000Z`)
  const to   = new Date(`${dateTo}T23:59:59.999Z`)

  // Fetch all non-cancelled order items in range
  const items = await prisma.orderItem.findMany({
    where: {
      order: {
        storeId,
        status:    { not: "CANCELLED" },
        createdAt: { gte: from, lte: to },
      },
    },
    select: {
      productId:   true,
      productName: true,
      quantity:    true,
      subtotal:    true,
      status:      true,
      product: {
        select: {
          category: { select: { name: true } },
        },
      },
    },
  })

  // Aggregate by product
  const productMap = new Map<
    string,
    { productName: string; categoryName: string | null; quantitySold: number; revenue: number; refundedQuantity: number }
  >()

  const totalRevenue = items
    .filter((i) => i.status !== "CANCELLED")
    .reduce((s, i) => s + i.subtotal, 0)

  for (const item of items) {
    const key = item.productId ?? item.productName
    const entry = productMap.get(key) ?? {
      productName:      item.productName,
      categoryName:     item.product?.category?.name ?? null,
      quantitySold:     0,
      revenue:          0,
      refundedQuantity: 0,
    }
    if (item.status === "CANCELLED") {
      entry.refundedQuantity += item.quantity
    } else {
      entry.quantitySold += item.quantity
      entry.revenue      += item.subtotal
    }
    productMap.set(key, entry)
  }

  const all = Array.from(productMap.entries())
    .map(([productId, v]) => ({
      productId,
      productName:      v.productName,
      categoryName:     v.categoryName,
      quantitySold:     v.quantitySold,
      revenue:          v.revenue,
      refundedQuantity: v.refundedQuantity,
      revenueShare:     totalRevenue > 0
        ? parseFloat(((v.revenue / totalRevenue) * 100).toFixed(1))
        : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)

  const total = all.length
  const offset = (page - 1) * limit
  const rows   = all.slice(offset, offset + limit)

  return paginated(rows, buildPaginationMeta(page, limit, total))
}

export const GET = compose(withRequestContext, withErrorHandling)(handleReportsProducts)
