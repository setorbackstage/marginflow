import "server-only"
import type { NextRequest } from "next/server"
import { z } from "zod"
import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/server/db"
import { orderService, authorizationService } from "@/server/services"
import { requireAuth, parseQuery, parseJsonBody, requireUuidParams } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, paginated, buildPaginationMeta, created } from "@/server/lib/http"
import { getOrderWithDetailsOrThrow, toOrderResponse } from "./_order-response"

interface RouteContext {
  params: Promise<{ storeId: string }>
}

/** API_SPEC.md `GET /api/v1/stores/:storeId/orders` — query parameters. */
const listOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
  type: z.enum(["DELIVERY", "TAKEAWAY", "DINE_IN"]).optional(),
  channel: z.enum(["IN_STORE", "PHONE", "MARKETPLACE", "WHATSAPP", "KIOSK"]).optional(),
  customerId: z.string().optional(),
  search: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sort: z.enum(["created_at", "grand_total", "number"]).default("created_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
})

const SORT_FIELD_MAP: Record<string, keyof Prisma.OrderOrderByWithRelationInput> = {
  created_at: "createdAt",
  grand_total: "grandTotal",
  number: "number",
}

/**
 * API_SPEC.md documents `dateFrom`/`dateTo` as "store timezone" boundaries.
 * There is no timezone-conversion library in this project yet, so this
 * treats the dates as UTC day boundaries — a simplification, not a
 * silent invention of the business rule. Revisit once a tz library is
 * available and the store's `timezone` is threaded through here.
 */
function buildDateRange(dateFrom?: string, dateTo?: string): Prisma.OrderWhereInput["createdAt"] | undefined {
  if (!dateFrom && !dateTo) return undefined
  const range: { gte?: Date; lte?: Date } = {}
  if (dateFrom) range.gte = new Date(`${dateFrom}T00:00:00.000Z`)
  if (dateTo) range.lte = new Date(`${dateTo}T23:59:59.999Z`)
  return range
}

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

async function handleListOrders(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "orders:view")

  const query = parseQuery(request.nextUrl.searchParams, listOrdersQuerySchema)

  const where: Prisma.OrderWhereInput = {
    ...(query.status ? { status: { in: query.status.split(",") } } : {}),
    ...(query.type ? { type: query.type } : {}),
    ...(query.channel ? { channel: query.channel } : {}),
    ...(query.customerId ? { customerId: query.customerId } : {}),
    createdAt: buildDateRange(query.dateFrom, query.dateTo),
    ...(query.search
      ? {
          OR: [
            ...(Number.isInteger(Number(query.search)) ? [{ number: Number(query.search) }] : []),
            { customer: { name: { contains: query.search, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  }
  const orderBy: Prisma.OrderOrderByWithRelationInput = { [SORT_FIELD_MAP[query.sort]]: query.order }

  const [orders, total] = await Promise.all([
    orderService.listByStore(prisma, storeId, {
      where,
      orderBy,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    orderService.count(prisma, { storeId, ...where }),
  ])

  return paginated(orders.map(toOrderListItem), buildPaginationMeta(query.page, query.limit, total))
}

/** API_SPEC.md `POST /api/v1/stores/:storeId/orders` — request body. */
const createOrderItemInputSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1),
  selectedModifiers: z
    .array(
      z.object({
        modifierId: z.string().min(1),
        modifierGroupId: z.string().min(1),
      }),
    )
    .optional(),
  notes: z.string().max(200).nullable().optional(),
})

const createOrderSchema = z.object({
  type: z.enum(["DELIVERY", "TAKEAWAY", "DINE_IN"]),
  channel: z.enum(["IN_STORE", "PHONE", "MARKETPLACE", "WHATSAPP", "KIOSK"]),
  customerId: z.string().nullable().optional(),
  deliveryAddressId: z.string().nullable().optional(),
  tableNumber: z.string().nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  scheduledFor: z.string().nullable().optional(),
  items: z.array(createOrderItemInputSchema).min(1),
})

async function handleCreateOrder(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "orders:create")

  const input = await parseJsonBody(request, createOrderSchema)

  const newOrder = await prisma.$transaction((tx) => orderService.create(tx, storeId, input, actor.userId))
  const order = await getOrderWithDetailsOrThrow(storeId, newOrder.id)
  return created(await toOrderResponse(order))
}

export const GET = compose(withRequestContext, withErrorHandling)(handleListOrders)
export const POST = compose(withRequestContext, withErrorHandling)(handleCreateOrder)
