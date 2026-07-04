import "server-only"
import type { DbClient } from "../db"
import type { Membership, Role, Store, User } from "../../generated/prisma/client"
import { userRepository, membershipRepository, storeRepository, roleRepository } from "../repositories"
import { NotFoundError } from "../lib/errors"

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
}
