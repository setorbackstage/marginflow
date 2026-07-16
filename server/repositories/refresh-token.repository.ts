import "server-only"
import type { DbClient } from "../db"
import type { RefreshToken, Prisma } from "../../generated/prisma/client"
import type { PaginationParams } from "./pagination"

/**
 * Pure data access for the `refresh_tokens` table. No business rules here.
 * No delete method — DATA_MODEL.md: a row is never physically deleted,
 * only `revoked_at` is set (rotation/logout/invalidation), so a reused,
 * already-rotated token can still be recognized.
 */
export const refreshTokenRepository = {
  findById(db: DbClient, id: string): Promise<RefreshToken | null> {
    return db.refreshToken.findUnique({ where: { id } })
  },

  exists(db: DbClient, id: string): Promise<boolean> {
    return db.refreshToken.findUnique({ where: { id }, select: { id: true } }).then(Boolean)
  },

  /** `token_hash` is unique — the lookup path on every refresh call. */
  findByTokenHash(db: DbClient, tokenHash: string): Promise<RefreshToken | null> {
    return db.refreshToken.findUnique({ where: { tokenHash } })
  },

  findManyByUser(
    db: DbClient,
    userId: string,
    params: PaginationParams & { where?: Prisma.RefreshTokenWhereInput } = {},
  ): Promise<RefreshToken[]> {
    return db.refreshToken.findMany({
      where: { userId, ...params.where },
      orderBy: { createdAt: "desc" },
      skip: params.skip,
      take: params.take,
    })
  },

  count(db: DbClient, userId: string, where: Prisma.RefreshTokenWhereInput = {}): Promise<number> {
    return db.refreshToken.count({ where: { userId, ...where } })
  },

  create(db: DbClient, data: Prisma.RefreshTokenCreateInput): Promise<RefreshToken> {
    return db.refreshToken.create({ data })
  },

  update(db: DbClient, id: string, data: Prisma.RefreshTokenUpdateInput): Promise<RefreshToken> {
    return db.refreshToken.update({ where: { id }, data })
  },

  /**
   * Revoga em massa todos os tokens ativos de um usuário.
   * Usado em reset de senha, aceitação de convite e detecção de replay.
   * Retorna o número de tokens revogados.
   */
  revokeAllForUser(db: DbClient, userId: string): Promise<number> {
    return db.refreshToken
      .updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } })
      .then((r) => r.count)
  },
}
