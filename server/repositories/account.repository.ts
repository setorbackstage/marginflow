import "server-only"
import type { DbClient } from "../db"
import type { Account, Prisma } from "../../generated/prisma/client"
import type { PaginationParams } from "./pagination"

/**
 * Pure data access for the `accounts` table. No business rules here. No
 * delete method — API_SPEC.md documents no endpoint that removes an
 * Account, and DATA_MODEL.md's referential integrity rules block deleting
 * an account that has stores.
 */
export const accountRepository = {
  findById(db: DbClient, id: string): Promise<Account | null> {
    return db.account.findUnique({ where: { id } })
  },

  exists(db: DbClient, id: string): Promise<boolean> {
    return db.account.findUnique({ where: { id }, select: { id: true } }).then(Boolean)
  },

  /** `email` is globally unique — the primary lookup path for billing/auth. */
  findByEmail(db: DbClient, email: string): Promise<Account | null> {
    return db.account.findUnique({ where: { email } })
  },

  findMany(
    db: DbClient,
    params: PaginationParams & { where?: Prisma.AccountWhereInput; orderBy?: Prisma.AccountOrderByWithRelationInput } = {},
  ): Promise<Account[]> {
    return db.account.findMany({
      where: params.where,
      orderBy: params.orderBy ?? { createdAt: "desc" },
      skip: params.skip,
      take: params.take,
    })
  },

  findManyByOrganization(db: DbClient, organizationId: string): Promise<Account[]> {
    return db.account.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" } })
  },

  count(db: DbClient, where: Prisma.AccountWhereInput = {}): Promise<number> {
    return db.account.count({ where })
  },

  create(db: DbClient, data: Prisma.AccountCreateInput): Promise<Account> {
    return db.account.create({ data })
  },

  update(db: DbClient, id: string, data: Prisma.AccountUpdateInput): Promise<Account> {
    return db.account.update({ where: { id }, data })
  },
}
