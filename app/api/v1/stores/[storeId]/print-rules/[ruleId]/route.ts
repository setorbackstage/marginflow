import "server-only"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/server/db"
import { authorizationService } from "@/server/services"
import { printRuleService } from "@/server/printing"
import { requireAuth, parseJsonBody, requireUuidParams, logAudit } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok, noContent } from "@/server/lib/http"

interface RouteContext {
  params: Promise<{ storeId: string; ruleId: string }>
}

const updatePrintRuleSchema = z.object({
  printerId:  z.string().uuid().optional(),
  templateId: z.string().uuid().optional(),
  event:      z.string().min(1).optional(),
  sector:     z.string().nullable().optional(),
  isActive:   z.boolean().optional(),
  sortOrder:  z.number().int().min(0).optional(),
})

async function handleUpdatePrintRule(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, ruleId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "settings:edit")

  const input = await parseJsonBody(request, updatePrintRuleSchema)
  const rule = await printRuleService.update(prisma, storeId, ruleId, input)
  void logAudit(prisma, { storeId, userId: actor.userId, action: "print_rule.updated", entityType: "PrintRule", entityId: ruleId, entityRef: rule.event })
  return ok(rule)
}

async function handleDeletePrintRule(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, ruleId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "settings:edit")

  const rule = await printRuleService.getById(prisma, storeId, ruleId)
  await printRuleService.delete(prisma, storeId, ruleId)
  void logAudit(prisma, { storeId, userId: actor.userId, action: "print_rule.deleted", entityType: "PrintRule", entityId: ruleId, entityRef: rule.event })
  return noContent()
}

export const PATCH  = compose(withRequestContext, withErrorHandling)(handleUpdatePrintRule)
export const DELETE = compose(withRequestContext, withErrorHandling)(handleDeletePrintRule)
