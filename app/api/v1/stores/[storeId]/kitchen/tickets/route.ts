import "server-only"
import type { NextRequest } from "next/server"
import { z } from "zod"
import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/server/db"
import { kitchenService, authorizationService } from "@/server/services"
import { requireAuth, parseQuery, requireUuidParams } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok } from "@/server/lib/http"
import { toTicketResponse } from "../_ticket-response"

interface RouteContext {
  params: Promise<{ storeId: string }>
}

/** API_SPEC.md `GET /api/v1/stores/:storeId/kitchen/tickets` — query parameters. */
const listTicketsQuerySchema = z.object({
  status: z.string().default("QUEUED,PREPARING"),
  sort: z.enum(["queued_at", "order_number"]).default("queued_at"),
  order: z.enum(["asc", "desc"]).default("asc"),
})

const SORT_FIELD_MAP: Record<string, keyof Prisma.KitchenTicketOrderByWithRelationInput> = {
  queued_at: "queuedAt",
  order_number: "orderNumber",
}

async function handleListTickets(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "kitchen:view")

  const query = parseQuery(request.nextUrl.searchParams, listTicketsQuerySchema)
  const tickets = await kitchenService.listByStore(prisma, storeId, {
    where: { status: { in: query.status.split(",") } },
    orderBy: { [SORT_FIELD_MAP[query.sort]]: query.order },
    take: 200, // Safety cap — kitchen never shows >200 active tickets simultaneously
  })

  return ok(tickets.map(toTicketResponse))
}

export const GET = compose(withRequestContext, withErrorHandling)(handleListTickets)
