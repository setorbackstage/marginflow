import "server-only"
import type { DbClient } from "../db"
import type { Role, Prisma } from "../../generated/prisma/client"
import type { PaginationParams } from "./pagination"

/**
 * Pure data access for the `roles` table. No business rules here. No
 * delete method — API_SPEC.md documents no endpoint that removes a Role,
 * and DATA_MODEL.md's referential integrity rules block deleting a role
 * that is still in use by a Membership.
 */
export const roleRepository = {
  findById(db: DbClient, id: string): Promise<Role | null> {
    return db.role.findUnique({ where: { id } })
  },

  exists(db: DbClient, id: string): Promise<boolean> {
    return db.role.findUnique({ where: { id }, select: { id: true } }).then(Boolean)
  },

  /** `(store_id, name)` is unique — a store cannot have two roles with the same name. */
  findByStoreAndName(db: DbClient, storeId: string, name: string): Promise<Role | null> {
    return db.role.findUnique({ where: { storeId_name: { storeId, name } } })
  },

  findManyByStore(
    db: DbClient,
    storeId: string,
    params: PaginationParams & { where?: Prisma.RoleWhereInput; orderBy?: Prisma.RoleOrderByWithRelationInput } = {},
  ): Promise<Role[]> {
    return db.role.findMany({
      where: { storeId, ...params.where },
      orderBy: params.orderBy,
      skip: params.skip,
      take: params.take,
    })
  },

  count(db: DbClient, where: Prisma.RoleWhereInput): Promise<number> {
    return db.role.count({ where })
  },

  create(db: DbClient, data: Prisma.RoleCreateInput): Promise<Role> {
    return db.role.create({ data })
  },

  update(db: DbClient, id: string, data: Prisma.RoleUpdateInput): Promise<Role> {
    return db.role.update({ where: { id }, data })
  },
}
