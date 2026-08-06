import "server-only"
import type { NextRequest } from "next/server"
import { prisma } from "@/server/db"
import { authorizationService } from "@/server/services"
import { requireAuth, requireUuidParams } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok, withRateLimit } from "@/server/lib/http"
import { getStorePrintConfig, saveStorePrintConfig } from "@/server/printing/config"
import type { PrintProviderId } from "@/server/printing/types"

interface RouteContext {
  params: Promise<{ storeId: string }>
}

async function handleGetConfig(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "printing:view")
  return ok(await getStorePrintConfig(prisma, storeId))
}

const PROVIDERS: PrintProviderId[] = ["QZ_TRAY", "PRINTER_AGENT", "ESC_POS_TCP", "CLOUD_PRINT"]

async function handlePutConfig(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "printing:manage")
  const body = await request.json()
  if (body.provider && !PROVIDERS.includes(body.provider)) {
    return ok({ error: "invalid_provider" }, { status: 400 })
  }
  const cfg = await saveStorePrintConfig(prisma, storeId, body)
  return ok(cfg)
}

export const GET = compose(withRequestContext, withRateLimit(), withErrorHandling)(handleGetConfig)
export const PUT = compose(withRequestContext, withRateLimit(), withErrorHandling)(handlePutConfig)
