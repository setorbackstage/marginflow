import "server-only"
import type { NextRequest } from "next/server"
import { z } from "zod"
import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/server/db"
import { menuService, authorizationService } from "@/server/services"
import type { UpdateMenuInput } from "@/server/services"
import { requireAuth, parseJsonBody, requireUuidParams } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok, noContent } from "@/server/lib/http"
import { toMenuDetailResponse, toMenuResponse } from "../_menu-response"

interface RouteContext {
  params: Promise<{ storeId: string; menuId: string }>
}

/**
 * API_SPEC.md `PATCH /api/v1/stores/:storeId/menus/:menuId` — request body.
 * `.strict()` because the doc explicitly documents `422 VALIDATION_ERROR`
 * when the body includes `status` — that field (and any other) is out of
 * scope for this endpoint; use publish/unpublish instead.
 */
const updateMenuSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).nullable().optional(),
    availabilitySchedule: z.record(z.string(), z.unknown()).nullable().optional(),
  })
  .strict()

async function handleGetMenu(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, menuId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "menu:view")

  const menu = await menuService.getById(prisma, storeId, menuId)
  return ok(toMenuDetailResponse(menu))
}

async function handleUpdateMenu(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, menuId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "menu:edit")

  const input = await parseJsonBody(request, updateMenuSchema)
  const updateInput: UpdateMenuInput = {
    ...input,
    availabilitySchedule: input.availabilitySchedule as Prisma.InputJsonValue | null | undefined,
  }
  const menu = await menuService.update(prisma, storeId, menuId, updateInput)
  return ok(toMenuResponse(menu))
}

async function handleDeleteMenu(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, menuId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "menu:edit")

  await menuService.remove(prisma, storeId, menuId)
  return noContent()
}

export const GET = compose(withRequestContext, withErrorHandling)(handleGetMenu)
export const PATCH = compose(withRequestContext, withErrorHandling)(handleUpdateMenu)
export const DELETE = compose(withRequestContext, withErrorHandling)(handleDeleteMenu)
