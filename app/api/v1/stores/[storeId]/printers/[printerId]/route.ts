import "server-only"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/server/db"
import { authorizationService } from "@/server/services"
import { printerService } from "@/server/printing"
import { requireAuth, parseJsonBody, requireUuidParams, logAudit } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok, noContent } from "@/server/lib/http"

interface RouteContext {
  params: Promise<{ storeId: string; printerId: string }>
}

const updatePrinterSchema = z.object({
  name:      z.string().min(1).max(100).optional(),
  type:      z.enum(["KITCHEN", "BAR", "CONFECTIONERY", "CASHIER", "FISCAL", "DELIVERY", "EXPEDITION", "GENERAL"]).optional(),
  model:     z.string().max(100).nullable().optional(),
  interface: z.enum(["USB", "NETWORK", "BLUETOOTH", "SERIAL", "VIRTUAL"]).optional(),
  address:   z.string().max(200).nullable().optional(),
  isDefault: z.boolean().optional(),
  isActive:  z.boolean().optional(),
})

async function handleGetPrinter(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, printerId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "settings:view")

  const printer = await printerService.getById(prisma, storeId, printerId)
  return ok(printer)
}

async function handleUpdatePrinter(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, printerId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "settings:edit")

  const input = await parseJsonBody(request, updatePrinterSchema)
  const printer = await printerService.update(prisma, storeId, printerId, input)
  void logAudit(prisma, { storeId, userId: actor.userId, action: "printer.updated", entityType: "Printer", entityId: printerId, entityRef: printer.name })
  return ok(printer)
}

async function handleDeletePrinter(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, printerId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "settings:edit")

  const printer = await printerService.getById(prisma, storeId, printerId)
  await printerService.delete(prisma, storeId, printerId)
  void logAudit(prisma, { storeId, userId: actor.userId, action: "printer.deleted", entityType: "Printer", entityId: printerId, entityRef: printer.name })
  return noContent()
}

export const GET    = compose(withRequestContext, withErrorHandling)(handleGetPrinter)
export const PATCH  = compose(withRequestContext, withErrorHandling)(handleUpdatePrinter)
export const DELETE = compose(withRequestContext, withErrorHandling)(handleDeletePrinter)
