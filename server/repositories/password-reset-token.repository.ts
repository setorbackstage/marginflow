import "server-only"
import type { DbClient } from "../db"
import type { PasswordResetToken, Prisma } from "../../generated/prisma/client"

export const passwordResetTokenRepository = {
  findByTokenHash(db: DbClient, tokenHash: string): Promise<PasswordResetToken | null> {
    return db.passwordResetToken.findUnique({ where: { tokenHash } })
  },
  findActiveByUserId(db: DbClient, userId: string): Promise<PasswordResetToken | null> {
    return db.passwordResetToken.findFirst({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    })
  },
  create(db: DbClient, data: Prisma.PasswordResetTokenCreateInput): Promise<PasswordResetToken> {
    return db.passwordResetToken.create({ data })
  },
  update(db: DbClient, id: string, data: Prisma.PasswordResetTokenUpdateInput): Promise<PasswordResetToken> {
    return db.passwordResetToken.update({ where: { id }, data })
  },
  revokeAllForUser(db: DbClient, userId: string): Promise<Prisma.BatchPayload> {
    return db.passwordResetToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  },
}
