import "server-only"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/server/db"
import { menuService, authorizationService } from "@/server/services"
import { requireAuth, parseJsonBody, requireUuidParams } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok } from "@/server/lib/http"
import { toMenuDetailResponse } from "../../_menu-response"

interface RouteContext {
  params: Promise<{ storeId: string; menuId: string }>
}

/** API_SPEC.md `PUT /api/v1/stores/:storeId/menus/:menuId/sections` — request body. */
const replaceSectionsSchema = z.object({
  sections: z.array(
    z.object({
      categoryId: z.string().min(1),
      sortOrder: z.number().int().min(0),
      isVisible: z.boolean(),
    }),
  ),
})

async function handleReplaceSections(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, menuId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "menu:edit")

  const input = await parseJsonBody(request, replaceSectionsSchema)
  await menuService.replaceSections(prisma, storeId, menuId, input.sections)

  const menu = await menuService.getById(prisma, storeId, menuId)
  return ok(toMenuDetailResponse(menu))
}

export const PUT = compose(withRequestContext, withErrorHandling)(handleReplaceSections)
