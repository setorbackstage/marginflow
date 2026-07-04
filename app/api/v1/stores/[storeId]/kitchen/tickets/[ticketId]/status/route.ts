import "server-only"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/server/db"
import { kitchenService, authorizationService } from "@/server/services"
import { requireAuth, parseJsonBody, requireUuidParams } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok } from "@/server/lib/http"
import { toTicketResponse } from "../../../_ticket-response"

interface RouteContext {
  params: Promise<{ storeId: string; ticketId: string }>
}

/** API_SPEC.md `POST /api/v1/stores/:storeId/kitchen/tickets/:ticketId/status` — request body. */
const updateTicketStatusSchema = z.object({
  status: z.enum(["QUEUED", "PREPARING", "READY", "CANCELLED"]),
})

async function handleUpdateTicketStatus(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, ticketId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "kitchen:update_status")

  const input = await parseJsonBody(request, updateTicketStatusSchema)
  // API_SPEC.md's Event Contracts: side effects of this transition (e.g. Delivery
  // creation on kitchen_ticket.ready, the parent Order advancing status) must
  // land in the same database transaction as the ticket status change itself.
  await prisma.$transaction((tx) => kitchenService.updateTicketStatus(tx, storeId, ticketId, input.status))

  const ticket = await kitchenService.getByIdWithItems(prisma, storeId, ticketId)
  return ok(toTicketResponse(ticket))
}

export const POST = compose(withRequestContext, withErrorHandling)(handleUpdateTicketStatus)
