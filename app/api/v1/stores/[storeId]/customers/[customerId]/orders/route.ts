import "server-only"
import type { NextRequest } from "next/server"
import { z } from "zod"
import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/server/db"
import { customerService, orderService, authorizationService } from "@/server/services"
import { requireAuth, parseQuery, requireUuidParams } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, paginated, buildPaginationMeta } from "@/server/lib/http"

interface RouteContext {
  params: Promise<{ storeId: string; customerId: string }>
}

/** API_SPEC.md `GET .../customers/:customerId/orders` — "Same shape as GET /orders, filtered to this customer." */
const listCustomerOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
  sort: z.enum(["created_at", "grand_total", "number"]).default("created_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
})

const SORT_FIELD_MAP: Record<string, keyof Prisma.OrderOrderByWithRelationInput> = {
  created_at: "createdAt",
  grand_total: "grandTotal",
  number: "number",
}

/** Mirrors API_SPEC.md's `GET /orders` list-item shape (duplicated here — the Orders route's own mapper is private and Orders is out of scope for this phase). */
function toOrderListItem(order: Awaited<ReturnType<typeof orderService.listByStore>>[number]) {
  return {
    id: order.id,
    storeId: order.storeId,
    number: order.number,
    status: order.status,
    type: order.type,
    channel: order.channel,
    customerId: order.customerId,
    customerName: order.customer?.name ?? null,
    customerPhone: order.customer?.phone ?? null,
    grandTotal: order.grandTotal,
    itemsTotal: order.itemsTotal,
    discountTotal: order.discountTotal,
    deliveryFee: order.deliveryFee,
    scheduledFor: order.scheduledFor,
    createdAt: order.createdAt,
    confirmedAt: order.confirmedAt,
    readyAt: order.readyAt,
    deliveredAt: order.deliveredAt,
    cancelledAt: order.cancelledAt,
  }
}

async function handleListCustomerOrders(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, customerId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "customers:view")

  // Store Isolation (API_SPEC.md): confirms `customerId` belongs to this store before listing its orders.
  await customerService.getByIdInStore(prisma, storeId, customerId)

  const query = parseQuery(request.nextUrl.searchParams, listCustomerOrdersQuerySchema)
  const where: Prisma.OrderWhereInput = {
    customerId,
    ...(query.status ? { status: { in: query.status.split(",") } } : {}),
  }

  const [orders, total] = await Promise.all([
    orderService.listByStore(prisma, storeId, {
      where,
      orderBy: { [SORT_FIELD_MAP[query.sort]]: query.order },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    orderService.count(prisma, { storeId, ...where }),
  ])

  return paginated(orders.map(toOrderListItem), buildPaginationMeta(query.page, query.limit, total))
}

export const GET = compose(withRequestContext, withErrorHandling)(handleListCustomerOrders)
