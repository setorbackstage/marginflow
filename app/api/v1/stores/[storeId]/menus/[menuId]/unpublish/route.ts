import "server-only"
import type { NextRequest } from "next/server"
import { prisma } from "@/server/db"
import { menuService, authorizationService } from "@/server/services"
import { requireAuth } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok } from "@/server/lib/http"
import { toMenuResponse } from "../../_menu-response"

interface RouteContext {
  params: Promise<{ storeId: string; menuId: string }>
}

async function handleUnpublish(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, menuId } = await params
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "menu:publish")

  const menu = await menuService.unpublish(prisma, storeId, menuId)
  return ok(toMenuResponse(menu))
}

export const POST = compose(withRequestContext, withErrorHandling)(handleUnpublish)
