import "server-only"
import type { NextRequest } from "next/server"
import { prisma } from "@/server/db"
import { ingredientService, authorizationService } from "@/server/services"
import { requireAuth, requireUuidParams } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok } from "@/server/lib/http"

interface RouteContext {
  params: Promise<{ storeId: string }>
}

/**
 * API_SPEC.md `GET /api/v1/stores/:storeId/inventory/alerts` — derived state,
 * computed from current_stock vs min_stock at read time; there is no alerts
 * table. Sorted worst first: NEGATIVE, OUT, LOW.
 */
async function handleListAlerts(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "inventory:view")

  return ok(await ingredientService.listAlerts(prisma, storeId))
}

export const GET = compose(withRequestContext, withErrorHandling)(handleListAlerts)
