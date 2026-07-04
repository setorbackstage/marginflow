import "server-only"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/server/db"
import { storeService, authorizationService } from "@/server/services"
import type { UpdateStoreInput } from "@/server/services"
import type { Store } from "@/generated/prisma/client"
import { requireAuth, parseJsonBody, toJsonInput } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok } from "@/server/lib/http"

interface RouteContext {
  params: Promise<{ storeId: string }>
}

/** API_SPEC.md `PATCH /api/v1/stores/:storeId` — request body. `slug` is deliberately absent (immutable). */
const updateStoreSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  email: z.email().optional(),
  logoUrl: z.string().nullable().optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
  minimumOrderValue: z.number().int().min(0).optional(),
  deliveryFee: z.number().int().min(0).optional(),
  operatingHours: z.record(z.string(), z.unknown()).optional(),
  address: z
    .object({
      street: z.string().nullable().optional(),
      number: z.string().nullable().optional(),
      complement: z.string().nullable().optional(),
      neighborhood: z.string().nullable().optional(),
      city: z.string().nullable().optional(),
      state: z.string().nullable().optional(),
      postalCode: z.string().nullable().optional(),
      country: z.string().optional(),
      latitude: z.number().nullable().optional(),
      longitude: z.number().nullable().optional(),
    })
    .optional(),
})

/** API_SPEC.md `GET /api/v1/stores/:storeId` — response envelope shape. */
function toStoreResponse(store: Store) {
  return {
    id: store.id,
    accountId: store.accountId,
    name: store.name,
    slug: store.slug,
    type: store.type,
    status: store.status,
    phone: store.phone,
    email: store.email,
    logoUrl: store.logoUrl,
    timezone: store.timezone,
    currency: store.currency,
    minimumOrderValue: store.minimumOrderValue,
    deliveryFee: store.deliveryFee,
    operatingHours: store.operatingHours,
    address: {
      street: store.addressStreet,
      number: store.addressNumber,
      complement: store.addressComplement,
      neighborhood: store.addressNeighborhood,
      city: store.addressCity,
      state: store.addressState,
      postalCode: store.addressPostalCode,
      country: store.addressCountry,
      latitude: store.addressLatitude ? Number(store.addressLatitude) : null,
      longitude: store.addressLongitude ? Number(store.addressLongitude) : null,
    },
    createdAt: store.createdAt,
    updatedAt: store.updatedAt,
  }
}

async function handleGetStore(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId } = await params
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "store:view")

  const store = await storeService.getById(prisma, storeId)
  return ok(toStoreResponse(store))
}

async function handleUpdateStore(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId } = await params
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "store:edit")

  const input = await parseJsonBody(request, updateStoreSchema)
  const updateInput: UpdateStoreInput = {
    ...input,
    operatingHours: input.operatingHours ? toJsonInput(input.operatingHours) : undefined,
  }
  const store = await storeService.update(prisma, storeId, updateInput)
  return ok(toStoreResponse(store))
}

export const GET = compose(withRequestContext, withErrorHandling)(handleGetStore)
export const PATCH = compose(withRequestContext, withErrorHandling)(handleUpdateStore)
