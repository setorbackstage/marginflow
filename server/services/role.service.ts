import "server-only"
import type { DbClient } from "../db"
import type { Role } from "../../generated/prisma/client"
import { roleRepository, membershipRepository } from "../repositories"

export interface RoleWithMemberCount extends Role {
  memberCount: number
}

export const roleService = {
  /** `GET /stores/:storeId/roles` — each role annotated with its active member count. */
  async listByStore(db: DbClient, storeId: string): Promise<RoleWithMemberCount[]> {
    const [roles, memberships] = await Promise.all([
      roleRepository.findManyByStore(db, storeId),
      membershipRepository.findManyByStore(db, storeId),
    ])

    const countByRoleId = new Map<string, number>()
    for (const membership of memberships) {
      if (membership.status !== "ACTIVE") continue
      countByRoleId.set(membership.roleId, (countByRoleId.get(membership.roleId) ?? 0) + 1)
    }

    return roles.map((role) => ({ ...role, memberCount: countByRoleId.get(role.id) ?? 0 }))
  },
}
