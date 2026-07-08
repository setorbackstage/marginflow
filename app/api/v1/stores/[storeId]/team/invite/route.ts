import "server-only"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/server/db"
import { membershipService, storeService, authorizationService } from "@/server/services"
import { requireAuth, parseJsonBody, requireUuidParams } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, created } from "@/server/lib/http"

interface RouteContext {
  params: Promise<{ storeId: string }>
}

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
  const membership = await prisma.$transaction((tx) =>
    membershipService.inviteMember(tx, storeId, store.name, input, actor.userId),
  )

  return created({
    membershipId: membership.id,
    email: input.email,
    status: membership.status,
    invitedAt: membership.invitedAt,
  })
}

export const POST = compose(withRequestContext, withErrorHandling)(handleInviteMember)
