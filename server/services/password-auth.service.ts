import "server-only"
import type { DbClient } from "../db"
import { userRepository, passwordResetTokenRepository, invitationTokenRepository, membershipRepository, refreshTokenRepository } from "../repositories"
import { hashPassword, generateRawToken, hashToken } from "../lib"
import { UnauthorizedError, NotFoundError, logger } from "../lib"

const RESET_TTL_MINUTES = 60

export const passwordAuthService = {
  /**
   * POST /auth/forgot-password
   * Generates a reset token, revokes any existing active ones, and logs
   * the reset link (replace with an email provider in production).
   * Always returns without error to avoid user enumeration.
   */
  async forgotPassword(db: DbClient, email: string): Promise<void> {
    const user = await userRepository.findByEmail(db, email)
    if (!user) {
      // Do not reveal whether the email exists
      logger.info("password_auth.forgot_password.user_not_found", { email })
      return
    }

    await passwordResetTokenRepository.revokeAllForUser(db, user.id)

    const rawToken = generateRawToken()
    const tokenHash = hashToken(rawToken)
    const expiresAt = new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000)

    await passwordResetTokenRepository.create(db, {
      user: { connect: { id: user.id } },
      tokenHash,
      expiresAt,
    })

    // TODO: replace with real email provider (Resend, SendGrid, etc.)
    // The raw token is logged here for development; in production it must be emailed.
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/reset-password?token=${rawToken}`
    logger.info("password_auth.forgot_password.token_issued", {
      userId: user.id,
      expiresAt: expiresAt.toISOString(),
      resetUrl, // DEVELOPMENT ONLY — remove or replace with email send in production
    })
  },

  /**
   * POST /auth/reset-password
   * Validates the token, updates the password, revokes the token.
   */
  async resetPassword(db: DbClient, rawToken: string, newPassword: string): Promise<void> {
    const tokenHash = hashToken(rawToken)
    const record = await passwordResetTokenRepository.findByTokenHash(db, tokenHash)

    if (!record || record.revokedAt !== null || record.expiresAt < new Date()) {
      throw new UnauthorizedError("INVALID_OR_EXPIRED_TOKEN", "Token inválido ou expirado.")
    }

    const passwordHash = await hashPassword(newPassword)

    await db.$transaction(async (tx) => {
      await userRepository.update(tx, record.userId, { passwordHash, status: "ACTIVE" })
      await passwordResetTokenRepository.update(tx, record.id, { revokedAt: new Date() })
      // Revoga todas as sessões ativas — quem redefiniu a senha assume controle total.
      await refreshTokenRepository.revokeAllForUser(tx, record.userId)
    })

    logger.info("password_auth.reset_password.success", { userId: record.userId })
  },

  /**
   * POST /auth/accept-invitation
   * Validates the invitation token, sets the user's password and activates
   * their membership.
   */
  async acceptInvitation(db: DbClient, rawToken: string, password: string): Promise<void> {
    const tokenHash = hashToken(rawToken)
    const record = await invitationTokenRepository.findByTokenHash(db, tokenHash)

    if (!record || record.revokedAt !== null || record.expiresAt < new Date()) {
      throw new UnauthorizedError("INVALID_OR_EXPIRED_TOKEN", "Convite inválido ou expirado.")
    }

    const membership = await membershipRepository.findById(db, record.membershipId)
    if (!membership) {
      throw new NotFoundError("MEMBERSHIP_NOT_FOUND", "Membership não encontrado.")
    }

    const passwordHash = await hashPassword(password)

    await db.$transaction(async (tx) => {
      await userRepository.update(tx, membership.userId, {
        passwordHash,
        status: "ACTIVE",
      })
      await membershipRepository.update(tx, membership.id, {
        status: "ACTIVE",
        acceptedAt: new Date(),
      })
      await invitationTokenRepository.update(tx, record.id, { revokedAt: new Date() })
      // Garante sessão limpa após ativação do convite.
      await refreshTokenRepository.revokeAllForUser(tx, membership.userId)
    })

    logger.info("password_auth.accept_invitation.success", { membershipId: membership.id, userId: membership.userId })
  },
}
