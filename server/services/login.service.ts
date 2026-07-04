import "server-only"
import type { DbClient } from "../db"
import type { Membership, Role, Store, User } from "../../generated/prisma/client"
import { userRepository, membershipRepository, storeRepository, roleRepository, refreshTokenRepository } from "../repositories"
import { ForbiddenError, UnauthorizedError } from "../lib/errors"
import { verifyPassword, signAccessToken, generateRawToken, hashToken, REFRESH_TOKEN_TTL_SECONDS } from "../lib/auth"
import type { LoginInput } from "../lib/auth"

export interface LoginMembershipContext {
  membership: Membership
  store: Store
  role: Role
}

export interface LoginResult {
  user: User
  memberships: LoginMembershipContext[]
  accessToken: string
  /** Raw refresh token — the caller (future Controller) delivers this as the `mf_refresh_token` cookie. Only its hash is persisted. */
  refreshToken: string
}

async function loadMembershipContext(db: DbClient, userId: string): Promise<LoginMembershipContext[]> {
  const memberships = await membershipRepository.findManyByUser(db, userId)
  return Promise.all(
    memberships.map(async (membership) => {
      const [store, role] = await Promise.all([
        storeRepository.findById(db, membership.storeId),
        roleRepository.findById(db, membership.roleId),
      ])
      if (!store || !role) {
        throw new UnauthorizedError("INVALID_CREDENTIALS", "Email not found or password incorrect.")
      }
      return { membership, store, role }
    }),
  )
}

/**
 * `POST /auth/login`. Input is assumed already validated by
 * `loginSchema` (Zod) at the Controller layer — this service does not
 * re-validate email format or password presence.
 */
export const loginService = {
  async login(db: DbClient, input: LoginInput): Promise<LoginResult> {
    const user = await userRepository.findByEmail(db, input.email)
    if (!user) {
      throw new UnauthorizedError("INVALID_CREDENTIALS", "Email not found or password incorrect.")
    }

    // Business Rule: "A user with status INVITED cannot login until they
    // have set a password via the invitation flow." (API_SPEC.md)
    if (user.status === "INVITED") {
      throw new ForbiddenError("USER_INVITED", "This user has not yet accepted their invitation.")
    }
    // API_SPEC.md's documented error for this exact case.
    if (user.status === "INACTIVE") {
      throw new ForbiddenError("USER_INACTIVE", "The user's status is INACTIVE.")
    }

    // Password verification occurs exactly once, here. `passwordHash` is
    // only ever null for INVITED users, already rejected above — the
    // fallback below is a defensive guard against a data-integrity
    // anomaly, not a second verification path.
    const passwordMatches = user.passwordHash ? await verifyPassword(input.password, user.passwordHash) : false
    if (!passwordMatches) {
      throw new UnauthorizedError("INVALID_CREDENTIALS", "Email not found or password incorrect.")
    }

    const memberships = await loadMembershipContext(db, user.id)

    const accessToken = signAccessToken(user.id, user.email)
    const rawRefreshToken = generateRawToken()
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000)

    // Persist ONLY the hash — the raw token is never written to the database.
    await refreshTokenRepository.create(db, {
      user: { connect: { id: user.id } },
      tokenHash: hashToken(rawRefreshToken),
      expiresAt,
    })

    const updatedUser = await userRepository.update(db, user.id, { lastLoginAt: new Date() })

    return {
      user: updatedUser,
      memberships,
      accessToken,
      refreshToken: rawRefreshToken,
    }
  },
}
