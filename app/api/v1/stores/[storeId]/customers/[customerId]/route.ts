import "server-only"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/server/db"
import { customerService, authorizationService } from "@/server/services"
import { requireAuth, parseJsonBody, requireUuidParams, logAudit } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok } from "@/server/lib/http"
import { toCustomerDetailResponse } from "../_customer-response"

interface RouteContext {
  params: Promise<{ storeId: string; customerId: string }>
}

/** API_SPEC.md `PATCH /api/v1/stores/:storeId/customers/:customerId` — request body. `totalOrders`/`totalSpent` are deliberately absent (read-only, system-computed). */
const updateCustomerSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  phone: z.string().min(8).max(20).optional(),
  email: z.email().nullable().optional(),
  taxId: z
    .string()
    .regex(/^\d{11}$/, "taxId must be an 11-digit CPF.")
    .nullable()
    .optional(),
  notes: z.string().max(500).nullable().optional(),
  status: z.enum(["ACTIVE", "BLOCKED"]).optional(),
})

async function handleGetCustomer(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, customerId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "customers:view")

  const customer = await customerService.getByIdInStore(prisma, storeId, customerId)
  return ok(await toCustomerDetailResponse(customer))
}

/**
 * API_SPEC.md: "customers:edit (for field updates); customers:block (for
 * status changes)". A request may touch either or both — each permission is
 * checked only for the fields actually present in the body.
 */
async function handleUpdateCustomer(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, customerId } = requireUuidParams(await params)
  const actor = requireAuth(request)

  const input = await parseJsonBody(request, updateCustomerSchema)
  const { status, ...fields } = input
  const hasFieldChanges = Object.keys(fields).length > 0

  if (hasFieldChanges) {
    await authorizationService.requirePermission(prisma, actor.userId, storeId, "customers:edit")
  }
  if (status !== undefined) {
    await authorizationService.requirePermission(prisma, actor.userId, storeId, "customers:block")
  }

  const customer = await customerService.update(prisma, storeId, customerId, input)
  if (hasFieldChanges) {
    void logAudit(prisma, { storeId, userId: actor.userId, action: "customer.updated", entityType: "Customer", entityId: customerId, entityRef: customer.name })
  }
  if (status !== undefined) {
    void logAudit(prisma, { storeId, userId: actor.userId, action: status === "BLOCKED" ? "customer.blocked" : "customer.unblocked", entityType: "Customer", entityId: customerId, entityRef: customer.name })
  }
  return ok(await toCustomerDetailResponse(customer))
}

export const GET = compose(withRequestContext, withErrorHandling)(handleGetCustomer)
export const PATCH = compose(withRequestContext, withErrorHandling)(handleUpdateCustomer)
