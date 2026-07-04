import "server-only"
import type { DbClient } from "../db"
import type { Organization, Prisma } from "../../generated/prisma/client"
import type { PaginationParams } from "./pagination"

/**
 * Pure data access for the `organizations` table. No business rules — see
 * DOMAIN_MODEL.md for what an Organization means and DATA_MODEL.md for its
 * schema. This entity has no delete endpoint documented in API_SPEC.md, so
 * no delete method is provided here — Organizations are the root of the
 * hierarchy and are never removed through the API.
 */
export const organizationRepository = {
  findById(db: DbClient, id: string): Promise<Organization | null> {
    return db.organization.findUnique({ where: { id } })
  },

  exists(db: DbClient, id: string): Promise<boolean> {
    return db.organization.findUnique({ where: { id }, select: { id: true } }).then(Boolean)
  },

  findMany(
    db: DbClient,
    params: PaginationParams & { where?: Prisma.OrganizationWhereInput; orderBy?: Prisma.OrganizationOrderByWithRelationInput } = {},
  ): Promise<Organization[]> {
    return db.organization.findMany({
      where: params.where,
      orderBy: params.orderBy ?? { createdAt: "desc" },
      skip: params.skip,
      take: params.take,
    })
  },

  count(db: DbClient, where: Prisma.OrganizationWhereInput = {}): Promise<number> {
    return db.organization.count({ where })
  },

  create(db: DbClient, data: Prisma.OrganizationCreateInput): Promise<Organization> {
    return db.organization.create({ data })
  },

  update(db: DbClient, id: string, data: Prisma.OrganizationUpdateInput): Promise<Organization> {
    return db.organization.update({ where: { id }, data })
  },
}
