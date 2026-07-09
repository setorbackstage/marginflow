import "server-only"
import type { NextRequest } from "next/server"
import { prisma } from "@/server/db"
import { authorizationService } from "@/server/services"
import { ifoodSyncService } from "@/server/services/ifood-sync.service"
import { requireAuth, requireUuidParams } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok } from "@/server/lib/http"
import { ValidationError } from "@/server/lib/errors"

interface RouteContext {
  params: Promise<{ storeId: string; platform: string }>
}

async function handleSync(req: NextRequest, ctx: RouteContext) {
  const { storeId, platform } = await ctx.params
  requireUuidParams({ storeId })

  if (platform.toUpperCase() !== "IFOOD") {
    throw new ValidationError([{ field: "platform", message: "Manual sync is only supported for IFOOD." }])
  }

  const session = requireAuth(req)
  await authorizationService.requirePermission(prisma, session.userId, storeId, "integrations:manage")

  const result = await ifoodSyncService.pollIfoodStoreOnce(storeId)
  return ok(result)
}

export const POST = compose(withRequestContext, withErrorHandling)(handleSync)
