import "server-only"
import type { NextRequest } from "next/server"
import { prisma } from "@/server/db"
import { roleService, authorizationService } from "@/server/services"
import type { RoleWithMemberCount } from "@/server/services"
import { requireAuth } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok } from "@/server/lib/http"

interface RouteContext {
  params: Promise<{ storeId: string }>
}

/** API_SPEC.md `GET /api/v1/stores/:storeId/roles` — response envelope shape. */
function toRoleResponse(role: RoleWithMemberCount) {
  return {
    id: role.id,
    name: role.name,
    displayName: role.displayName,
    permissions: role.permissions,
    isSystemRole: role.isSystemRole,
    memberCount: role.memberCount,
  }
}

async function handleListRoles(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId } = await params
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "users:view")

  const roles = await roleService.listByStore(prisma, storeId)
  return ok(roles.map(toRoleResponse))
}

export const GET = compose(withRequestContext, withErrorHandling)(handleListRoles)
