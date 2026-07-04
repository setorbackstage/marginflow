import "server-only"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/server/db"
import { deliveryService, orderService, authorizationService } from "@/server/services"
import { requireAuth, parseJsonBody, requireUuidParams } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok } from "@/server/lib/http"
import { toDeliveryResponse } from "../_delivery-response"

interface RouteContext {
  params: Promise<{ storeId: string; deliveryId: string }>
}

/** API_SPEC.md `PATCH /api/v1/stores/:storeId/deliveries/:deliveryId` — request body. */
const assignCourierSchema = z.object({
  courierName: z.string().min(1),
  courierPhone: z.string().nullable().optional(),
  courierType: z.enum(["INTERNAL", "PLATFORM"]),
  platform: z.enum(["IFOOD", "RAPPI", "UBER_EATS", "LOGGI", "OTHER"]).nullable().optional(),
  platformDeliveryId: z.string().nullable().optional(),
  estimatedMinutes: z.number().int().positive().nullable().optional(),
})

async function handleGetDelivery(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, deliveryId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "delivery:view")

  const delivery = await deliveryService.getById(prisma, storeId, deliveryId)
  const order = await orderService.getById(prisma, delivery.orderId)
  return ok(toDeliveryResponse(delivery, order.number))
}

async function handleAssignCourier(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, deliveryId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "delivery:assign_courier")

  const input = await parseJsonBody(request, assignCourierSchema)
  const isManagerOrOwner = await authorizationService.isManagerOrOwner(prisma, actor.userId, storeId)

  const delivery = await deliveryService.assignCourier(prisma, storeId, deliveryId, input, isManagerOrOwner)
  const order = await orderService.getById(prisma, delivery.orderId)
  return ok(toDeliveryResponse(delivery, order.number))
}

export const GET = compose(withRequestContext, withErrorHandling)(handleGetDelivery)
export const PATCH = compose(withRequestContext, withErrorHandling)(handleAssignCourier)
