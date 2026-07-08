import "server-only"
import type { DbClient } from "../db"
import type { Role } from "../../generated/prisma/client"
import { membershipRepository, roleRepository, userRepository } from "../repositories"
import { ForbiddenError } from "../lib/errors"
import { verifyPassword } from "../lib/auth"

/**
 * Data-driven authorization (RBAC), per DOMAIN_MODEL.md's Role entity:
 * "the single source of truth for permission checks." This assumes the
 * caller (`actorUserId`) has already been authenticated — that is Auth's
 * job, a separate, not-yet-built layer. This service only answers "given
 * this already-verified user, what can they do at this store?"
 */
export const authorizationService = {
  /** The actor's Role at this store, or `null` if they hold no ACTIVE membership there. */
  async getActiveRole(db: DbClient, userId: string, storeId: string): Promise<Role | null> {
    const membership = await membershipRepository.findByUserAndStore(db, userId, storeId)
    if (!membership || membership.status !== "ACTIVE") return null
    return roleRepository.findById(db, membership.roleId)
  },

  async hasPermission(db: DbClient, userId: string, storeId: string, permission: string): Promise<boolean> {
    const role = await authorizationService.getActiveRole(db, userId, storeId)
    return role?.permissions.includes(permission) ?? false
  },

  /**
   * API_SPEC.md's "Store Isolation" steps 3-4: throws `STORE_ACCESS_DENIED`
   * (no active Membership at this Store) or `INSUFFICIENT_PERMISSIONS`
   * (has Membership, lacks this specific permission). Returns the Role so
   * callers needing further checks (e.g. `isManagerOrOwner`) don't have to
   * re-fetch it.
   */
  async requirePermission(db: DbClient, userId: string, storeId: string, permission: string): Promise<Role> {
    const role = await authorizationService.getActiveRole(db, userId, storeId)
    if (!role) {
      throw new ForbiddenError("STORE_ACCESS_DENIED", "User has no active membership at this store.")
    }
    if (!role.permissions.includes(permission)) {
      throw new ForbiddenError("INSUFFICIENT_PERMISSIONS", "User lacks the required permission for this action.")
    }
    return role
  },

  /**
   * `OWNER` or `MANAGER` role at this store. Used for the specific checks
   * API_SPEC.md phrases as "requires manager or owner role" rather than a
   * named permission string — e.g. Business Rule 22 (cancelling a
   * dispatched delivery) and courier reassignment after dispatch.
   */
  async isManagerOrOwner(db: DbClient, userId: string, storeId: string): Promise<boolean> {
    const role = await authorizationService.getActiveRole(db, userId, storeId)
    return role?.name === "OWNER" || role?.name === "MANAGER"
  },

  /**
   * "Manager override" — verifies `email`+`approvalPassword` belong to a
   * MANAGER/OWNER of this store, without issuing a session. Lets a
   * non-manager staff member get a manager's on-the-spot approval (e.g.
   * Business Rule 46: cancelling an order already in preparation) right at
   * the terminal, instead of logging out and having the manager log in.
   *
   * Deliberately checks `approvalPasswordHash`, NOT the login
   * `passwordHash` — a manager typing their real account password in front
   * of a cashier at a shared terminal is a real exposure risk, so this is a
   * second, separate credential each manager opts into via `meService.
   * setApprovalPassword`. If they haven't set one, `approvalPasswordHash`
   * is null and this always fails — same generic outcome as "no such
   * user" / "wrong password" / "not a manager here", so none of those
   * cases is distinguishable from the response.
   */
  async verifyManagerCredentials(db: DbClient, storeId: string, email: string, approvalPassword: string): Promise<boolean> {
    const user = await userRepository.findByEmail(db, email)
    if (!user || user.status !== "ACTIVE" || !user.approvalPasswordHash) return false
    if (!(await verifyPassword(approvalPassword, user.approvalPasswordHash))) return false
    return authorizationService.isManagerOrOwner(db, user.id, storeId)
  },
}
