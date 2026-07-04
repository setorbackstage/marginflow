import "server-only"
import type { DbClient } from "../db"
import { refreshTokenRepository } from "../repositories"
import { hashToken } from "../lib/auth"

/**
 * `POST /auth/logout`. API_SPEC.md documents no error responses for this
 * endpoint and a bare `204 No Content` success — logout is idempotent: an
 * unknown or already-revoked token is not an error, it simply means there
 * is nothing left to invalidate.
 */
export const logoutService = {
  async logout(db: DbClient, rawRefreshToken: string): Promise<void> {
    const tokenHash = hashToken(rawRefreshToken)
    const existing = await refreshTokenRepository.findByTokenHash(db, tokenHash)
    if (!existing || existing.revokedAt) return

    await refreshTokenRepository.update(db, existing.id, { revokedAt: new Date() })
  },
}
