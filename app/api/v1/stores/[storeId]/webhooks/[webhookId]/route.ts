import "server-only"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/server/db"
import { webhookDeliveryService, authorizationService } from "@/server/services"
import { requireAuth, parseJsonBody, requireUuidParams, logAudit } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok, noContent } from "@/server/lib/http"

interface RouteContext {
  params: Promise<{ storeId: string; webhookId: string }>
}

const updateSchema = z.object({
  url: z.string().url().refine((u) => u.startsWith("https://"), {
    message: "O endpoint deve usar HTTPS.",
  }).optional(),
  events: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
})

async function handleUpdate(req: NextRequest, ctx: RouteContext) {
  const { storeId, webhookId } = requireUuidParams(await ctx.params)
  const session = requireAuth(req)
  await authorizationService.requirePermission(prisma, session.userId, storeId, "integrations:manage")

  const patch = await parseJsonBody(req, updateSchema)
  const endpoint = await webhookDeliveryService.update(prisma, webhookId, storeId, patch)

  void logAudit(prisma, {
    storeId,
    userId: session.userId,
    action: "webhook.updated",
    entityType: "WebhookEndpoint",
    entityId: webhookId,
    entityRef: endpoint.url,
  })

  return ok(endpoint)
}

async function handleDelete(req: NextRequest, ctx: RouteContext) {
  const { storeId, webhookId } = requireUuidParams(await ctx.params)
  const session = requireAuth(req)
  await authorizationService.requirePermission(prisma, session.userId, storeId, "integrations:manage")

  await webhookDeliveryService.delete(prisma, webhookId, storeId)

  void logAudit(prisma, {
    storeId,
    userId: session.userId,
    action: "webhook.deleted",
    entityType: "WebhookEndpoint",
    entityId: webhookId,
  })

  return noContent()
}

export const PATCH  = compose(withRequestContext, withErrorHandling)(handleUpdate)
export const DELETE = compose(withRequestContext, withErrorHandling)(handleDelete)
