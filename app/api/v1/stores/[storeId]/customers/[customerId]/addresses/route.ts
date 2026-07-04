import "server-only"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/server/db"
import { customerService, addressService, authorizationService } from "@/server/services"
import { requireAuth, parseJsonBody } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok, created } from "@/server/lib/http"
import { toAddressResponse } from "../../_customer-response"

interface RouteContext {
  params: Promise<{ storeId: string; customerId: string }>
}

/** API_SPEC.md `POST .../addresses` — request body. */
const createAddressSchema = z.object({
  label: z.enum(["HOME", "WORK", "OTHER"]).optional(),
  street: z.string().min(1),
  number: z.string().min(1),
  complement: z.string().nullable().optional(),
  neighborhood: z.string().min(1),
  city: z.string().min(1),
  state: z.string().length(2),
  postalCode: z.string().min(1),
  country: z.string().length(2).optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  isDefault: z.boolean().optional(),
})

async function handleListAddresses(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, customerId } = await params
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "customers:view")

  // Store Isolation (API_SPEC.md): confirms `customerId` belongs to this store before listing.
  await customerService.getByIdInStore(prisma, storeId, customerId)
  const addresses = await addressService.listByCustomer(prisma, customerId)
  return ok(addresses.map(toAddressResponse))
}

async function handleCreateAddress(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, customerId } = await params
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "customers:edit")

  // Store Isolation (API_SPEC.md): confirms `customerId` belongs to this store before creating.
  await customerService.getByIdInStore(prisma, storeId, customerId)
  const input = await parseJsonBody(request, createAddressSchema)

  const address = input.isDefault
    ? await prisma.$transaction((tx) => addressService.create(tx, customerId, input))
    : await addressService.create(prisma, customerId, input)

  return created(toAddressResponse(address))
}

export const GET = compose(withRequestContext, withErrorHandling)(handleListAddresses)
export const POST = compose(withRequestContext, withErrorHandling)(handleCreateAddress)
