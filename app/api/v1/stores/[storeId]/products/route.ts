import "server-only"
import type { NextRequest } from "next/server"
import { z } from "zod"
import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/server/db"
import { productService, authorizationService } from "@/server/services"
import type { CreateProductInput } from "@/server/services"
import { requireAuth, parseJsonBody, parseQuery, requireUuidParams, logAudit } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, paginated, buildPaginationMeta, created } from "@/server/lib/http"
import { toProductListItem, toProductDetailResponse } from "./_product-response"

interface RouteContext {
  params: Promise<{ storeId: string }>
}

/** API_SPEC.md `GET /api/v1/stores/:storeId/products` — query parameters. */
const listProductsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  categoryId: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "OUT_OF_STOCK"]).optional(),
  type: z.enum(["SIMPLE", "COMBO", "SERVICE_CHARGE"]).optional(),
  search: z.string().optional(),
  sort: z.enum(["sort_order", "name", "price", "created_at"]).default("sort_order"),
  order: z.enum(["asc", "desc"]).default("asc"),
})

const SORT_FIELD_MAP: Record<string, keyof Prisma.ProductOrderByWithRelationInput> = {
  sort_order: "sortOrder",
  name: "name",
  price: "price",
  created_at: "createdAt",
}

/** API_SPEC.md `POST /api/v1/stores/:storeId/products` — request body. */
const createProductSchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().min(2).max(120),
  description: z.string().max(1000).nullable().optional(),
  price: z.number().int().min(0),
  imageUrl: z.url().nullable().optional(),
  sku: z.string().max(50).nullable().optional(),
  type: z.enum(["SIMPLE", "COMBO", "SERVICE_CHARGE"]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "OUT_OF_STOCK"]).optional(),
  sortOrder: z.number().int().min(0).optional(),
  availabilitySchedule: z.record(z.string(), z.unknown()).nullable().optional(),
})

async function handleListProducts(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "products:view")

  const query = parseQuery(request.nextUrl.searchParams, listProductsQuerySchema)
  const where: Prisma.ProductWhereInput = {
    ...(query.categoryId ? { categoryId: query.categoryId } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.type ? { type: query.type } : {}),
    ...(query.search
      ? { OR: [{ name: { contains: query.search, mode: "insensitive" as const } }, { sku: { contains: query.search, mode: "insensitive" as const } }] }
      : {}),
  }

  const [products, total] = await Promise.all([
    productService.listByStore(prisma, storeId, {
      where,
      orderBy: { [SORT_FIELD_MAP[query.sort]]: query.order },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    productService.count(prisma, { storeId, deletedAt: null, ...where }),
  ])

  return paginated(products.map(toProductListItem), buildPaginationMeta(query.page, query.limit, total))
}

async function handleCreateProduct(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "products:create")

  const input = await parseJsonBody(request, createProductSchema)
  const createInput: CreateProductInput = {
    ...input,
    availabilitySchedule: input.availabilitySchedule as Prisma.InputJsonValue | null | undefined,
  }
  const product = await productService.create(prisma, storeId, createInput)
  void logAudit(prisma, { storeId, userId: actor.userId, action: "product.created", entityType: "Product", entityId: product.id, entityRef: product.name })
  const detail = await productService.getByIdWithModifierGroups(prisma, storeId, product.id)
  return created(toProductDetailResponse(detail))
}

export const GET = compose(withRequestContext, withErrorHandling)(handleListProducts)
export const POST = compose(withRequestContext, withErrorHandling)(handleCreateProduct)
