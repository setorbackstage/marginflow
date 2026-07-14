import "server-only"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/server/db"
import { authorizationService } from "@/server/services"
import { printTemplateService } from "@/server/printing"
import { requireAuth, parseJsonBody, requireUuidParams, logAudit } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok, noContent } from "@/server/lib/http"

interface RouteContext {
  params: Promise<{ storeId: string; templateId: string }>
}

const updatePrintTemplateSchema = z.object({
  name:     z.string().min(1).max(100).optional(),
  type:     z.enum(["ORDER", "RECEIPT", "CANCELLATION", "LABEL", "KITCHEN", "DELIVERY", "TEST"]).optional(),
  layout:   z.record(z.string(), z.unknown()).optional(),
  isActive: z.boolean().optional(),
})

async function handleGetPrintTemplate(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, templateId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "settings:view")

  const template = await printTemplateService.getById(prisma, storeId, templateId)
  return ok(template)
}

async function handleUpdatePrintTemplate(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, templateId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "settings:edit")

  const input = await parseJsonBody(request, updatePrintTemplateSchema)
  const template = await printTemplateService.update(prisma, storeId, templateId, input)
  void logAudit(prisma, { storeId, userId: actor.userId, action: "print_template.updated", entityType: "PrintTemplate", entityId: templateId, entityRef: template.name })
  return ok(template)
}

async function handleDeletePrintTemplate(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, templateId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "settings:edit")

  const template = await printTemplateService.getById(prisma, storeId, templateId)
  await printTemplateService.delete(prisma, storeId, templateId)
  void logAudit(prisma, { storeId, userId: actor.userId, action: "print_template.deleted", entityType: "PrintTemplate", entityId: templateId, entityRef: template.name })
  return noContent()
}

export const GET    = compose(withRequestContext, withErrorHandling)(handleGetPrintTemplate)
export const PATCH  = compose(withRequestContext, withErrorHandling)(handleUpdatePrintTemplate)
export const DELETE = compose(withRequestContext, withErrorHandling)(handleDeletePrintTemplate)
