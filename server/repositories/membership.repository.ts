import "server-only"
import type { DbClient } from "../db"
import type { Membership, Prisma } from "../../generated/prisma/client"
import type { PaginationParams } from "./pagination"

/**
 * Pure data access for the `memberships` table. No business rules here. No
 * delete method — API_SPEC.md's `DELETE /team/:userId` is documented as
 * "Not a delete — sets the Membership status to REVOKED," which is a
 * regular `update`, not a row removal.
 */
export const membershipRepository = {
  findById(db: DbClient, id: string): Promise<Membership | null> {
    return db.membership.findUnique({ where: { id } })
  },

  exists(db: DbClient, id: string): Promise<boolean> {
    return db.membership.findUnique({ where: { id }, select: { id: true } }).then(Boolean)
  },

  /** `(user_id, store_id)` is unique — a user holds at most one membership per store. */
  findByUserAndStore(db: DbClient, userId: string, storeId: string): Promise<Membership | null> {
    return db.membership.findUnique({ where: { userId_storeId: { userId, storeId } } })
  },

  findManyByStore(
    db: DbClient,
    storeId: string,
    params: PaginationParams & { where?: Prisma.MembershipWhereInput; orderBy?: Prisma.MembershipOrderByWithRelationInput } = {},
  ): Promise<Membership[]> {
    return db.membership.findMany({
      where: { storeId, ...params.where },
      orderBy: params.orderBy,
      skip: params.skip,
      take: params.take,
    })
  },

  findManyByUser(db: DbClient, userId: string): Promise<Membership[]> {
    return db.membership.findMany({ where: { userId } })
  },

  count(db: DbClient, where: Prisma.MembershipWhereInput): Promise<number> {
    return db.membership.count({ where })
  },

  create(db: DbClient, data: Prisma.MembershipCreateInput): Promise<Membership> {
    return db.membership.create({ data })
  },

  update(db: DbClient, id: string, data: Prisma.MembershipUpdateInput): Promise<Membership> {
    return db.membership.update({ where: { id }, data })
  },
}
