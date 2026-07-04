import "server-only"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/server/db"
import { storeService, authorizationService } from "@/server/services"
import type { UpdateStoreSettingsInput } from "@/server/services"
import type { StoreSettings } from "@/generated/prisma/client"
import { requireAuth, parseJsonBody, toJsonInput } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok } from "@/server/lib/http"

interface RouteContext {
  params: Promise<{ storeId: string }>
}

/** API_SPEC.md `PATCH /api/v1/stores/:storeId/settings` — request body: any subset of settings fields. */
const updateSettingsSchema = z.object({
  autoConfirmOrders: z.boolean().optional(),
  printReceiptOnConfirm: z.boolean().optional(),
  receiptFormat: z.string().optional(),
  allowScheduledOrders: z.boolean().optional(),
  maxScheduledDaysAhead: z.number().int().min(1).optional(),
  acceptsCash: z.boolean().optional(),
  acceptsCard: z.boolean().optional(),
  acceptsPix: z.boolean().optional(),
  acceptsVoucher: z.boolean().optional(),
  acceptsOnlinePayment: z.boolean().optional(),
  notificationPreferences: z.record(z.string(), z.unknown()).optional(),
})

/** API_SPEC.md `GET /api/v1/stores/:storeId/settings` — response envelope shape. */
function toSettingsResponse(settings: StoreSettings) {
  return {
    storeId: settings.storeId,
    autoConfirmOrders: settings.autoConfirmOrders,
    printReceiptOnConfirm: settings.printReceiptOnConfirm,
    receiptFormat: settings.receiptFormat,
    allowScheduledOrders: settings.allowScheduledOrders,
    maxScheduledDaysAhead: settings.maxScheduledDaysAhead,
    acceptsCash: settings.acceptsCash,
    acceptsCard: settings.acceptsCard,
    acceptsPix: settings.acceptsPix,
    acceptsVoucher: settings.acceptsVoucher,
    acceptsOnlinePayment: settings.acceptsOnlinePayment,
    notificationPreferences: settings.notificationPreferences,
    updatedAt: settings.updatedAt,
  }
}

async function handleGetSettings(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId } = await params
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "settings:view")

  const settings = await storeService.getSettings(prisma, storeId)
  return ok(toSettingsResponse(settings))
}

async function handleUpdateSettings(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId } = await params
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "settings:edit")

  const input = await parseJsonBody(request, updateSettingsSchema)
  const updateInput: UpdateStoreSettingsInput = {
    ...input,
    notificationPreferences: input.notificationPreferences ? toJsonInput(input.notificationPreferences) : undefined,
  }
  const settings = await storeService.updateSettings(prisma, storeId, updateInput)
  return ok(toSettingsResponse(settings))
}

export const GET = compose(withRequestContext, withErrorHandling)(handleGetSettings)
export const PATCH = compose(withRequestContext, withErrorHandling)(handleUpdateSettings)
