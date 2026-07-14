import "server-only"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/server/db"
import { authorizationService } from "@/server/services"
import { printTemplateService } from "@/server/printing"
import { requireAuth, parseJsonBody, requireUuidParams, logAudit } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok, created } from "@/server/lib/http"

interface RouteContext {
  params: Promise<{ storeId: string }>
}

const createPrintTemplateSchema = z.object({
  name:     z.string().min(1).max(100),
  type:     z.enum(["ORDER", "RECEIPT", "CANCELLATION", "LABEL", "KITCHEN", "DELIVERY", "TEST"]),
  layout:   z.record(z.string(), z.unknown()).optional(),
  isActive: z.boolean().optional(),
})

async function handleListPrintTemplates(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "settings:view")

  const templates = await printTemplateService.list(prisma, storeId)
  return ok(templates)
}

async function handleCreatePrintTemplate(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "settings:edit")

  const input = await parseJsonBody(request, createPrintTemplateSchema)
  const template = await printTemplateService.create(prisma, storeId, input)
  void logAudit(prisma, { storeId, userId: actor.userId, action: "print_template.created", entityType: "PrintTemplate", entityId: template.id, entityRef: template.name })
  return created(template)
}

export const GET  = compose(withRequestContext, withErrorHandling)(handleListPrintTemplates)
export const POST = compose(withRequestContext, withErrorHandling)(handleCreatePrintTemplate)
