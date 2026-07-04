import "server-only"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/server/db"
import { kitchenService, authorizationService } from "@/server/services"
import { requireAuth, parseJsonBody } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok } from "@/server/lib/http"
import { toKitchenItemResponse } from "../../../_ticket-response"

interface RouteContext {
  params: Promise<{ storeId: string; itemId: string }>
}

/** API_SPEC.md `PATCH /api/v1/stores/:storeId/kitchen/items/:itemId/status` — request body. */
const updateItemStatusSchema = z.object({
  status: z.enum(["PREPARING", "READY"]),
})

async function handleUpdateItemStatus(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, itemId } = await params
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "kitchen:update_status")

  const input = await parseJsonBody(request, updateItemStatusSchema)
  const item = await kitchenService.updateItemStatus(prisma, storeId, itemId, input.status)

  return ok(toKitchenItemResponse(item))
}

export const PATCH = compose(withRequestContext, withErrorHandling)(handleUpdateItemStatus)
