import "server-only"
import type { NextRequest } from "next/server"
import { z } from "zod"
import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/server/db"
import { menuService, authorizationService } from "@/server/services"
import type { CreateMenuInput } from "@/server/services"
import { requireAuth, parseJsonBody, parseQuery } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok, created } from "@/server/lib/http"
import { toMenuListItem, toMenuDetailResponse } from "./_menu-response"

interface RouteContext {
  params: Promise<{ storeId: string }>
}

/** API_SPEC.md `GET /api/v1/stores/:storeId/menus` — query parameters. */
const listMenusQuerySchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE", "SCHEDULED"]).optional(),
  channel: z.enum(["DELIVERY", "IN_STORE", "MARKETPLACE", "KIOSK"]).optional(),
})

/** API_SPEC.md `POST /api/v1/stores/:storeId/menus` — request body. */
const createMenuSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  channel: z.enum(["DELIVERY", "IN_STORE", "MARKETPLACE", "KIOSK"]),
  status: z.enum(["ACTIVE", "INACTIVE", "SCHEDULED"]).optional(),
  availabilitySchedule: z.record(z.string(), z.unknown()).nullable().optional(),
})

async function handleListMenus(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId } = await params
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "menu:view")

  const query = parseQuery(request.nextUrl.searchParams, listMenusQuerySchema)
  const where: Prisma.MenuWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.channel ? { channel: query.channel } : {}),
  }

  const menus = await menuService.listByStore(prisma, storeId, { where })
  return ok(menus.map(toMenuListItem))
}

async function handleCreateMenu(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId } = await params
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "menu:create")

  const input = await parseJsonBody(request, createMenuSchema)
  const createInput: CreateMenuInput = {
    ...input,
    availabilitySchedule: input.availabilitySchedule as Prisma.InputJsonValue | null | undefined,
  }
  const menu = await menuService.create(prisma, storeId, createInput)
  const detail = await menuService.getById(prisma, storeId, menu.id)
  return created(toMenuDetailResponse(detail))
}

export const GET = compose(withRequestContext, withErrorHandling)(handleListMenus)
export const POST = compose(withRequestContext, withErrorHandling)(handleCreateMenu)
