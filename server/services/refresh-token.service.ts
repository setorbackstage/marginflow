import "server-only"
import type { DbClient } from "../db"
import { refreshTokenRepository, userRepository } from "../repositories"
import { UnauthorizedError } from "../lib/errors"
import { signAccessToken, generateRawToken, hashToken, REFRESH_TOKEN_TTL_SECONDS } from "../lib/auth"

export interface RefreshResult {
  accessToken: string
  /** Raw refresh token — the caller (future Controller) delivers this as the new `mf_refresh_token` cookie. Only its hash is persisted. */
  refreshToken: string
}

/** Revokes every currently-active refresh token for a user via a single updateMany. */
async function revokeAllActiveTokensForUser(db: DbClient, userId: string): Promise<void> {
  await refreshTokenRepository.revokeAllForUser(db, userId)
}

/**
 * `POST /auth/refresh`. The exclusive owner of refresh-token rotation —
 * LoginService only ever creates the first token of a session; every
 * subsequent rotation happens here.
 */
export const refreshTokenService = {
  async refresh(db: DbClient, rawToken: string): Promise<RefreshResult> {
    const tokenHash = hashToken(rawToken)
    const existing = await refreshTokenRepository.findByTokenHash(db, tokenHash)

    if (!existing) {
      throw new UnauthorizedError("REFRESH_TOKEN_INVALID", "Refresh token signature is invalid or has been rotated.")
    }

    if (existing.revokedAt) {
      // Replay attack: this token was already rotated out once before.
      await revokeAllActiveTokensForUser(db, existing.userId)
      throw new UnauthorizedError("REFRESH_TOKEN_INVALID", "Refresh token signature is invalid or has been rotated.")
    }

    if (existing.expiresAt <= new Date()) {
      throw new UnauthorizedError("REFRESH_TOKEN_EXPIRED", "Refresh token has expired.")
    }

    const user = await userRepository.findById(db, existing.userId)
    if (!user) {
      throw new UnauthorizedError("REFRESH_TOKEN_INVALID", "Refresh token signature is invalid or has been rotated.")
    }

    // Rotation: revoke the just-used token exactly once, then issue a new pair.
    await refreshTokenRepository.update(db, existing.id, { revokedAt: new Date() })

    const accessToken = signAccessToken(user.id, user.email)
    const rawNewRefreshToken = generateRawToken()
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000)

    // Persist ONLY the hash — the raw token is never written to the database.
    await refreshTokenRepository.create(db, {
      user: { connect: { id: user.id } },
      tokenHash: hashToken(rawNewRefreshToken),
      expiresAt,
    })

    return { accessToken, refreshToken: rawNewRefreshToken }
  },
}
