import "server-only"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/server/db"
import { marketplaceIntegrationService, authorizationService } from "@/server/services"
import { requireAuth, requireUuidParams, parseJsonBody } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, noContent, ok } from "@/server/lib/http"
import { ValidationError } from "@/server/lib/errors"
import { getIfoodAccessToken, pauseIfoodStore, resumeIfoodStore } from "@/server/integrations/ifood"
import { marketplaceIntegrationRepository } from "@/server/repositories"

interface RouteContext {
  params: Promise<{ storeId: string; platform: string }>
}

const SUPPORTED_PLATFORMS = ["IFOOD", "RAPPI", "UBER_EATS"]

const setPausedSchema = z.object({
  paused: z.boolean(),
})

async function handleDisconnect(req: NextRequest, ctx: RouteContext) {
  const { storeId, platform } = await ctx.params
  requireUuidParams({ storeId })

  if (!SUPPORTED_PLATFORMS.includes(platform.toUpperCase())) {
    throw new ValidationError([{ field: "platform", message: `Unknown platform: ${platform}` }])
  }

  const session = requireAuth(req)
  await authorizationService.requirePermission(prisma, session.userId, storeId, "integrations:manage")
  await marketplaceIntegrationService.disconnect(prisma, storeId, platform.toUpperCase())
  return noContent()
}

async function handleSetPaused(req: NextRequest, ctx: RouteContext) {
  const { storeId, platform } = await ctx.params
  requireUuidParams({ storeId })

  const normalizedPlatform = platform.toUpperCase()
  if (!SUPPORTED_PLATFORMS.includes(normalizedPlatform)) {
    throw new ValidationError([{ field: "platform", message: `Unknown platform: ${platform}` }])
  }

  const session = requireAuth(req)
  await authorizationService.requirePermission(prisma, session.userId, storeId, "integrations:manage")

  const body = await parseJsonBody(req, setPausedSchema)

  if (normalizedPlatform === "IFOOD") {
    const integration = await marketplaceIntegrationRepository.findByStorePlatform(prisma, storeId, normalizedPlatform)
    if (integration) {
      const accessToken = await getIfoodAccessToken()
      if (body.paused) {
        await pauseIfoodStore(accessToken, integration.merchantId)
      } else {
        await resumeIfoodStore(accessToken, integration.merchantId)
      }
    }
  }

  await marketplaceIntegrationService.setPaused(prisma, storeId, normalizedPlatform, body.paused)
  return ok({ isPaused: body.paused })
}

export const DELETE = compose(withRequestContext, withErrorHandling)(handleDisconnect)
export const PATCH = compose(withRequestContext, withErrorHandling)(handleSetPaused)
