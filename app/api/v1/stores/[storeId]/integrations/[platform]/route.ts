import "server-only"
import type { NextRequest } from "next/server"
import { prisma } from "@/server/db"
import { marketplaceIntegrationService, authorizationService } from "@/server/services"
import { requireAuth, requireUuidParams } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, noContent } from "@/server/lib/http"
import { ValidationError } from "@/server/lib/errors"

interface RouteContext {
  params: Promise<{ storeId: string; platform: string }>
}

const SUPPORTED_PLATFORMS = ["IFOOD", "RAPPI", "UBER_EATS"]

async function handleDisconnect(req: NextRequest, ctx: RouteContext) {
  const { storeId } = requireUuidParams(await ctx.params)
  const { platform } = await ctx.params

  if (!SUPPORTED_PLATFORMS.includes(platform.toUpperCase())) {
    throw new ValidationError([{ field: "platform", message: `Unknown platform: ${platform}` }])
  }

  const session = requireAuth(req)
  await authorizationService.requirePermission(prisma, session.userId, storeId, "integrations:manage")
  await marketplaceIntegrationService.disconnect(prisma, storeId, platform.toUpperCase())
  return noContent()
}

export const DELETE = compose(withRequestContext, withErrorHandling)(handleDisconnect)
