import "server-only"
import type { NextRequest } from "next/server"
import { prisma } from "@/server/db"
import { kitchenService, authorizationService } from "@/server/services"
import { requireAuth } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok } from "@/server/lib/http"
import { toTicketResponse } from "../../_ticket-response"

interface RouteContext {
  params: Promise<{ storeId: string; ticketId: string }>
}

async function handleGetTicket(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, ticketId } = await params
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "kitchen:view")

  const ticket = await kitchenService.getByIdWithItems(prisma, storeId, ticketId)
  return ok(toTicketResponse(ticket))
}

export const GET = compose(withRequestContext, withErrorHandling)(handleGetTicket)
