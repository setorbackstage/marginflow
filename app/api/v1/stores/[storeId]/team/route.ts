import "server-only"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/server/db"
import { membershipService, storeService, authorizationService } from "@/server/services"
import { requireAuth, parseQuery, parseJsonBody, requireUuidParams } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok, created } from "@/server/lib/http"
import { toTeamMemberListItem } from "./_team-response"

interface RouteContext {
  params: Promise<{ storeId: string }>
}

/** API_SPEC.md `GET /api/v1/stores/:storeId/team` — query parameters. */
const listTeamQuerySchema = z.object({
  status: z.string().optional(),
  search: z.string().optional(),
})

async function handleListTeam(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "users:view")

  const query = parseQuery(request.nextUrl.searchParams, listTeamQuerySchema)
  let members = await membershipService.listTeam(prisma, storeId)

  if (query.status) {
    const statuses = new Set(query.status.split(","))
    members = members.filter((m) => statuses.has(m.membership.status))
  }
  if (query.search) {
    const term = query.search.toLowerCase()
    members = members.filter((m) => m.user.name.toLowerCase().includes(term) || m.user.email.toLowerCase().includes(term))
  }

  return ok(members.map(toTeamMemberListItem))
}

/** API_SPEC.md `POST /api/v1/stores/:storeId/team/invite` — request body. */
const inviteMemberSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  roleId: z.string().min(1),
})

async function handleInviteMember(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "users:invite")

  const input = await parseJsonBody(request, inviteMemberSchema)
  const store = await storeService.getById(prisma, storeId)
  const membership = await prisma.$transaction((tx) => membershipService.inviteMember(tx, storeId, store.name, input, actor.userId))

  return created({
    membershipId: membership.id,
    email: input.email,
    status: membership.status,
    invitedAt: membership.invitedAt,
  })
}

export const GET = compose(withRequestContext, withErrorHandling)(handleListTeam)
export const POST = compose(withRequestContext, withErrorHandling)(handleInviteMember)
