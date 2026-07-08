import "server-only"
import type { DbClient } from "../db"
import type { Membership, Role, Store, User } from "../../generated/prisma/client"
import { userRepository, membershipRepository, storeRepository, roleRepository } from "../repositories"
import { NotFoundError, UnauthorizedError, ForbiddenError } from "../lib/errors"
import { hashPassword, verifyPassword } from "../lib/auth"

export interface MeMembershipContext {
  membership: Membership
  store: Store
  role: Role
}

export interface MeProfile {
  user: User
  memberships: MeMembershipContext[]
}

/**
 * `GET /auth/me`. `userId` comes from an already-verified access token
 * (`requireAuth`) — this service does not re-check credentials, only loads
 * the profile.
 */
export const meService = {
  async getProfile(db: DbClient, userId: string): Promise<MeProfile> {
    const user = await userRepository.findById(db, userId)
    if (!user) {
      throw new NotFoundError("USER_NOT_FOUND", "User no longer exists.")
    }

    const memberships = await membershipRepository.findManyByUser(db, userId)
    const context = await Promise.all(
      memberships.map(async (membership) => {
        const [store, role] = await Promise.all([
          storeRepository.findById(db, membership.storeId),
          roleRepository.findById(db, membership.roleId),
        ])
        if (!store || !role) {
          throw new NotFoundError("MEMBERSHIP_NOT_FOUND", "Membership references missing data.")
        }
        return { membership, store, role }
      }),
    )

    return { user, memberships: context }
  },

  /**
   * Sets or replaces the caller's own "approval password" (Business Rule
   * 46 manager override) — a second credential, separate from the login
   * password, used only to approve on-the-spot actions like cancelling an
   * order already in preparation. Requires re-entering the *login*
   * password first (standard confirm-before-changing-a-credential
   * practice), so a hijacked but still-open session can't silently plant
   * an approval password the real owner never chose.
   *
   * Restricted to users who hold an OWNER/MANAGER Role at at least one
   * ACTIVE Membership — line cooks, delivery couriers, cashiers, etc. have
   * no legitimate use for this credential, since `verifyManagerCredentials`
   * only ever accepts it from a manager/owner anyway. Rejecting it here
   * keeps the restriction visible at the point the password is created,
   * not just silently unusable later.
   */
  async setApprovalPassword(db: DbClient, userId: string, currentPassword: string, newApprovalPassword: string): Promise<void> {
    const user = await userRepository.findById(db, userId)
    if (!user) {
      throw new NotFoundError("USER_NOT_FOUND", "User no longer exists.")
    }
    const currentPasswordMatches = user.passwordHash ? await verifyPassword(currentPassword, user.passwordHash) : false
    if (!currentPasswordMatches) {
      throw new UnauthorizedError("INVALID_CREDENTIALS", "Current password is incorrect.")
    }

    const memberships = await membershipRepository.findManyByUser(db, userId)
    const activeRoleIds = memberships.filter((m) => m.status === "ACTIVE").map((m) => m.roleId)
    const roles = await Promise.all(activeRoleIds.map((roleId) => roleRepository.findById(db, roleId)))
    const isManagerOrOwnerSomewhere = roles.some((role) => role?.name === "OWNER" || role?.name === "MANAGER")
    if (!isManagerOrOwnerSomewhere) {
      throw new ForbiddenError(
        "APPROVAL_PASSWORD_REQUIRES_MANAGER_ROLE",
        "Only users with an OWNER or MANAGER role can configure an approval password.",
      )
    }

    const approvalPasswordHash = await hashPassword(newApprovalPassword)
    await userRepository.update(db, userId, { approvalPasswordHash })
  },
}
