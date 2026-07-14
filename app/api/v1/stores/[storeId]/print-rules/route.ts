import "server-only"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/server/db"
import { authorizationService } from "@/server/services"
import { printRuleService } from "@/server/printing"
import { requireAuth, parseJsonBody, requireUuidParams, logAudit } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok, created } from "@/server/lib/http"

interface RouteContext {
  params: Promise<{ storeId: string }>
}

const createPrintRuleSchema = z.object({
  printerId:  z.string().uuid(),
  templateId: z.string().uuid(),
  event:      z.string().min(1),
  sector:     z.string().nullable().optional(),
  isActive:   z.boolean().optional(),
  sortOrder:  z.number().int().min(0).optional(),
})

async function handleListPrintRules(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "settings:view")

  const rules = await printRuleService.list(prisma, storeId)
  return ok(rules)
}

async function handleCreatePrintRule(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "settings:edit")

  const input = await parseJsonBody(request, createPrintRuleSchema)
  const rule = await printRuleService.create(prisma, storeId, input)
  void logAudit(prisma, { storeId, userId: actor.userId, action: "print_rule.created", entityType: "PrintRule", entityId: rule.id, entityRef: rule.event })
  return created(rule)
}

export const GET  = compose(withRequestContext, withErrorHandling)(handleListPrintRules)
export const POST = compose(withRequestContext, withErrorHandling)(handleCreatePrintRule)
