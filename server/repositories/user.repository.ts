import "server-only"
import type { DbClient } from "../db"
import type { User, Prisma } from "../../generated/prisma/client"
import type { PaginationParams } from "./pagination"

/**
 * Pure data access for the `users` table. No business rules here. Users
 * are global identities with no delete endpoint in API_SPEC.md — access is
 * revoked per-Store via Membership (`status: REVOKED`), never by deleting
 * the User row.
 */
export const userRepository = {
  findById(db: DbClient, id: string): Promise<User | null> {
    return db.user.findUnique({ where: { id } })
  },

  exists(db: DbClient, id: string): Promise<boolean> {
    return db.user.findUnique({ where: { id }, select: { id: true } }).then(Boolean)
  },

  /** `email` is globally unique — the authentication lookup path. */
  findByEmail(db: DbClient, email: string): Promise<User | null> {
    return db.user.findUnique({ where: { email } })
  },

  findMany(
    db: DbClient,
    params: PaginationParams & { where?: Prisma.UserWhereInput; orderBy?: Prisma.UserOrderByWithRelationInput } = {},
  ): Promise<User[]> {
    return db.user.findMany({
      where: params.where,
      orderBy: params.orderBy ?? { createdAt: "desc" },
      skip: params.skip,
      take: params.take,
    })
  },

  count(db: DbClient, where: Prisma.UserWhereInput = {}): Promise<number> {
    return db.user.count({ where })
  },

  create(db: DbClient, data: Prisma.UserCreateInput): Promise<User> {
    return db.user.create({ data })
  },

  update(db: DbClient, id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return db.user.update({ where: { id }, data })
  },
}
