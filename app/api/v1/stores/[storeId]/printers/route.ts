import "server-only"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/server/db"
import { authorizationService } from "@/server/services"
import { printerService } from "@/server/printing"
import { requireAuth, parseJsonBody, requireUuidParams, logAudit } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok, created } from "@/server/lib/http"

interface RouteContext {
  params: Promise<{ storeId: string }>
}

const createPrinterSchema = z.object({
  name:      z.string().min(1).max(100),
  type:      z.enum(["KITCHEN", "BAR", "CONFECTIONERY", "CASHIER", "FISCAL", "DELIVERY", "EXPEDITION", "GENERAL"]).default("GENERAL"),
  model:     z.string().max(100).nullable().optional(),
  interface: z.enum(["USB", "NETWORK", "BLUETOOTH", "SERIAL", "VIRTUAL"]).default("NETWORK"),
  address:   z.string().max(200).nullable().optional(),
  isDefault: z.boolean().optional(),
  isActive:  z.boolean().optional(),
})

async function handleListPrinters(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "settings:view")

  const printers = await printerService.list(prisma, storeId)
  return ok(printers)
}

async function handleCreatePrinter(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "settings:edit")

  const input = await parseJsonBody(request, createPrinterSchema)
  const printer = await printerService.create(prisma, storeId, input)
  void logAudit(prisma, { storeId, userId: actor.userId, action: "printer.created", entityType: "Printer", entityId: printer.id, entityRef: printer.name })
  return created(printer)
}

export const GET  = compose(withRequestContext, withErrorHandling)(handleListPrinters)
export const POST = compose(withRequestContext, withErrorHandling)(handleCreatePrinter)
