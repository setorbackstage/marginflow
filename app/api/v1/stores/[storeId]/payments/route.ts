import "server-only"
import type { NextRequest } from "next/server"
import { z } from "zod"
import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/server/db"
import { paymentService, authorizationService } from "@/server/services"
import { requireAuth, parseQuery } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, paginated, buildPaginationMeta } from "@/server/lib/http"
import { toPaymentListItem } from "./_payment-response"

interface RouteContext {
  params: Promise<{ storeId: string }>
}

/** API_SPEC.md `GET /api/v1/stores/:storeId/payments` — query parameters. */
const listPaymentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
  method: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sort: z.enum(["paid_at", "amount", "created_at"]).default("paid_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
})

const SORT_FIELD_MAP: Record<string, keyof Prisma.PaymentOrderByWithRelationInput> = {
  paid_at: "paidAt",
  amount: "amount",
  created_at: "createdAt",
}

function buildDateRange(dateFrom?: string, dateTo?: string): Prisma.PaymentWhereInput["createdAt"] | undefined {
  if (!dateFrom && !dateTo) return undefined
  const range: { gte?: Date; lte?: Date } = {}
  if (dateFrom) range.gte = new Date(`${dateFrom}T00:00:00.000Z`)
  if (dateTo) range.lte = new Date(`${dateTo}T23:59:59.999Z`)
  return range
}

async function handleListPayments(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId } = await params
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "finance:view")

  const query = parseQuery(request.nextUrl.searchParams, listPaymentsQuerySchema)
  const where: Prisma.PaymentWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.method ? { method: query.method } : {}),
    createdAt: buildDateRange(query.dateFrom, query.dateTo),
  }

  const [payments, total] = await Promise.all([
    paymentService.listByStore(prisma, storeId, {
      where,
      orderBy: { [SORT_FIELD_MAP[query.sort]]: query.order },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    paymentService.count(prisma, { storeId, ...where }),
  ])

  return paginated(payments.map(toPaymentListItem), buildPaginationMeta(query.page, query.limit, total))
}

export const GET = compose(withRequestContext, withErrorHandling)(handleListPayments)
