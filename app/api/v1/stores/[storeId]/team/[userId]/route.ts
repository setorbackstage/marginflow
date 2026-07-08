import "server-only"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/server/db"
import { membershipService, authorizationService } from "@/server/services"
import { requireAuth, parseJsonBody, requireUuidParams } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok, noContent } from "@/server/lib/http"
import { toTeamMemberDetail } from "../_team-response"

interface RouteContext {
  params: Promise<{ storeId: string; userId: string }>
}

async function handleGetTeamMember(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, userId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "users:view")

  const member = await membershipService.getTeamMember(prisma, storeId, userId)
  return ok(toTeamMemberDetail(member))
}

/** API_SPEC.md `PATCH /api/v1/stores/:storeId/team/:userId/role` — request body. */
const changeRoleSchema = z.object({
  roleId: z.string().min(1),
})

async function handleChangeRole(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, userId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "users:edit")

  const input = await parseJsonBody(request, changeRoleSchema)
  await membershipService.changeRole(prisma, storeId, userId, input.roleId, actor.userId)
  const member = await membershipService.getTeamMember(prisma, storeId, userId)
  return ok(toTeamMemberDetail(member))
}

async function handleRevoke(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, userId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "users:remove")

  await membershipService.revoke(prisma, storeId, userId, actor.userId)
  return noContent()
}

export const GET = compose(withRequestContext, withErrorHandling)(handleGetTeamMember)
export const PATCH = compose(withRequestContext, withErrorHandling)(handleChangeRole)
export const DELETE = compose(withRequestContext, withErrorHandling)(handleRevoke)
