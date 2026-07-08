import "server-only"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/server/db"
import { marketplaceIntegrationService, authorizationService } from "@/server/services"
import type { MarketplaceIntegration } from "@/generated/prisma/client"
import { requireAuth, parseJsonBody, requireUuidParams } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok, created } from "@/server/lib/http"

interface RouteContext {
  params: Promise<{ storeId: string }>
}

const connectSchema = z.object({
  platform: z.string().min(1),
  merchantId: z.string().min(1, "merchantId is required"),
})

function toIntegrationResponse(i: MarketplaceIntegration) {
  return {
    id: i.id,
    storeId: i.storeId,
    platform: i.platform,
    merchantId: i.merchantId,
    status: i.status as "ACTIVE" | "INACTIVE" | "ERROR",
    lastSyncAt: i.lastSyncAt,
    errorMessage: i.errorMessage,
    createdAt: i.createdAt,
    updatedAt: i.updatedAt,
  }
}

async function handleList(req: NextRequest, ctx: RouteContext) {
  const { storeId } = requireUuidParams(await ctx.params)
  const session = requireAuth(req)
  await authorizationService.requirePermission(prisma, session.userId, storeId, "integrations:view")

  const integrations = await marketplaceIntegrationService.listByStore(prisma, storeId)
  return ok(integrations.map(toIntegrationResponse))
}

async function handleConnect(req: NextRequest, ctx: RouteContext) {
  const { storeId } = requireUuidParams(await ctx.params)
  const session = requireAuth(req)
  await authorizationService.requirePermission(prisma, session.userId, storeId, "integrations:manage")

  const body = await parseJsonBody(req, connectSchema)
  const integration = await marketplaceIntegrationService.connect(prisma, storeId, body)
  return created(toIntegrationResponse(integration))
}

export const GET = compose(withRequestContext, withErrorHandling)(handleList)
export const POST = compose(withRequestContext, withErrorHandling)(handleConnect)
