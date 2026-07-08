import "server-only"
import type { DbClient } from "../db"
import type { InvitationToken, Prisma } from "../../generated/prisma/client"

export const invitationTokenRepository = {
  findByTokenHash(db: DbClient, tokenHash: string): Promise<InvitationToken | null> {
    return db.invitationToken.findUnique({ where: { tokenHash } })
  },
  findActiveByMembershipId(db: DbClient, membershipId: string): Promise<InvitationToken | null> {
    return db.invitationToken.findFirst({
      where: { membershipId, revokedAt: null, expiresAt: { gt: new Date() } },
    })
  },
  create(db: DbClient, data: Prisma.InvitationTokenCreateInput): Promise<InvitationToken> {
    return db.invitationToken.create({ data })
  },
  update(db: DbClient, id: string, data: Prisma.InvitationTokenUpdateInput): Promise<InvitationToken> {
    return db.invitationToken.update({ where: { id }, data })
  },
  revokeAllForMembership(db: DbClient, membershipId: string): Promise<Prisma.BatchPayload> {
    return db.invitationToken.updateMany({
      where: { membershipId, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  },
}
