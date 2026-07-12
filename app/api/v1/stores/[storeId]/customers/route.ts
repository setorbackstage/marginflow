import "server-only"
import type { NextRequest } from "next/server"
import { z } from "zod"
import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/server/db"
import { customerService, authorizationService } from "@/server/services"
import { requireAuth, parseJsonBody, parseQuery, requireUuidParams, logAudit } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, paginated, buildPaginationMeta, created } from "@/server/lib/http"
import { toCustomerListItem, toCustomerDetailResponse } from "./_customer-response"

interface RouteContext {
  params: Promise<{ storeId: string }>
}

/** API_SPEC.md `GET /api/v1/stores/:storeId/customers` — query parameters. */
const listCustomersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(2000).default(20),
  status: z.enum(["ACTIVE", "BLOCKED"]).optional(),
  search: z.string().optional(),
  sort: z.enum(["name", "last_order_at", "total_spent", "total_orders", "created_at"]).default("last_order_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
})

const SORT_FIELD_MAP: Record<string, keyof Prisma.CustomerOrderByWithRelationInput> = {
  name: "name",
  last_order_at: "lastOrderAt",
  total_spent: "totalSpent",
  total_orders: "totalOrders",
  created_at: "createdAt",
}

/** API_SPEC.md `POST /api/v1/stores/:storeId/customers` — request body. */
const createCustomerSchema = z.object({
  name: z.string().min(2).max(120),
  phone: z.string().min(8).max(20),
  email: z.email().nullable().optional(),
  taxId: z
    .string()
    .regex(/^\d{11}$/, "taxId must be an 11-digit CPF.")
    .nullable()
    .optional(),
  notes: z.string().max(500).nullable().optional(),
})

async function handleListCustomers(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "customers:view")

  const query = parseQuery(request.nextUrl.searchParams, listCustomersQuerySchema)
  const where: Prisma.CustomerWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.search
      ? { OR: [{ name: { contains: query.search, mode: "insensitive" as const } }, { phone: { contains: query.search } }] }
      : {}),
  }

  const [customers, total] = await Promise.all([
    customerService.listByStore(prisma, storeId, {
      where,
      orderBy: { [SORT_FIELD_MAP[query.sort]]: query.order },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    customerService.count(prisma, { storeId, ...where }),
  ])

  return paginated(customers.map(toCustomerListItem), buildPaginationMeta(query.page, query.limit, total))
}

async function handleCreateCustomer(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "customers:create")

  const input = await parseJsonBody(request, createCustomerSchema)
  const customer = await customerService.create(prisma, storeId, input)
  void logAudit(prisma, { storeId, userId: actor.userId, action: "customer.created", entityType: "Customer", entityId: customer.id, entityRef: customer.name })
  return created(await toCustomerDetailResponse(customer))
}

export const GET = compose(withRequestContext, withErrorHandling)(handleListCustomers)
export const POST = compose(withRequestContext, withErrorHandling)(handleCreateCustomer)
