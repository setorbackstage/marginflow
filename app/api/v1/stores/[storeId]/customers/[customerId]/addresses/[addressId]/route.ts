import "server-only"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/server/db"
import { customerService, addressService, authorizationService } from "@/server/services"
import { requireAuth, parseJsonBody, requireUuidParams } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok, noContent } from "@/server/lib/http"
import { toAddressResponse } from "../../../_customer-response"

interface RouteContext {
  params: Promise<{ storeId: string; customerId: string; addressId: string }>
}

/** API_SPEC.md `PATCH .../addresses/:addressId` — request body: any subset of address fields. */
const updateAddressSchema = z.object({
  label: z.enum(["HOME", "WORK", "OTHER"]).optional(),
  street: z.string().min(1).optional(),
  number: z.string().min(1).optional(),
  complement: z.string().nullable().optional(),
  neighborhood: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  state: z.string().length(2).optional(),
  postalCode: z.string().min(1).optional(),
  country: z.string().length(2).optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  isDefault: z.boolean().optional(),
})

async function handleUpdateAddress(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, customerId, addressId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "customers:edit")

  // Store Isolation (API_SPEC.md): confirms `customerId` belongs to this store before mutating.
  await customerService.getByIdInStore(prisma, storeId, customerId)
  const input = await parseJsonBody(request, updateAddressSchema)

  const address = input.isDefault
    ? await prisma.$transaction((tx) => addressService.update(tx, customerId, addressId, input))
    : await addressService.update(prisma, customerId, addressId, input)

  return ok(toAddressResponse(address))
}

async function handleDeleteAddress(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, customerId, addressId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "customers:edit")

  // Store Isolation (API_SPEC.md): confirms `customerId` belongs to this store before mutating.
  await customerService.getByIdInStore(prisma, storeId, customerId)
  await addressService.softDelete(prisma, customerId, addressId)
  return noContent()
}

export const PATCH = compose(withRequestContext, withErrorHandling)(handleUpdateAddress)
export const DELETE = compose(withRequestContext, withErrorHandling)(handleDeleteAddress)
