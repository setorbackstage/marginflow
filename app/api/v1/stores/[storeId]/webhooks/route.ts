import "server-only"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/server/db"
import { webhookDeliveryService, authorizationService, SUPPORTED_EVENTS } from "@/server/services"
import { requireAuth, parseJsonBody, requireUuidParams, logAudit } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok, created } from "@/server/lib/http"

interface RouteContext {
  params: Promise<{ storeId: string }>
}

const createSchema = z.object({
  url: z.string().url("URL inválida.").refine((u) => u.startsWith("https://"), {
    message: "O endpoint deve usar HTTPS.",
  }),
  events: z.array(z.string()).default([]),
})

async function handleList(req: NextRequest, ctx: RouteContext) {
  const { storeId } = requireUuidParams(await ctx.params)
  const session = requireAuth(req)
  await authorizationService.requirePermission(prisma, session.userId, storeId, "integrations:view")

  const endpoints = await webhookDeliveryService.list(prisma, storeId)
  return ok({ data: endpoints, meta: { supportedEvents: SUPPORTED_EVENTS } })
}

async function handleCreate(req: NextRequest, ctx: RouteContext) {
  const { storeId } = requireUuidParams(await ctx.params)
  const session = requireAuth(req)
  await authorizationService.requirePermission(prisma, session.userId, storeId, "integrations:manage")

  const { url, events } = await parseJsonBody(req, createSchema)
  const endpoint = await webhookDeliveryService.create(prisma, storeId, url, events)

  void logAudit(prisma, {
    storeId,
    userId: session.userId,
    action: "webhook.created",
    entityType: "WebhookEndpoint",
    entityId: endpoint.id,
    entityRef: endpoint.url,
  })

  return created(endpoint)
}

export const GET  = compose(withRequestContext, withErrorHandling)(handleList)
export const POST = compose(withRequestContext, withErrorHandling)(handleCreate)
