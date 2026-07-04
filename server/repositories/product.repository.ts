import "server-only"
import type { DbClient } from "../db"
import type { Product, Prisma } from "../../generated/prisma/client"

/** Pure data access for the `products` table. */
export const productRepository = {
  findById(db: DbClient, id: string): Promise<Product | null> {
    return db.product.findUnique({ where: { id } })
  },

  /** API_SPEC.md `GET /products/:productId` — includes active Modifier Groups and their active Modifiers. */
  findByIdWithModifierGroups(db: DbClient, id: string) {
    return db.product.findUnique({
      where: { id },
      include: {
        modifierGroups: {
          where: { deletedAt: null },
          orderBy: { sortOrder: "asc" },
          include: { modifiers: { where: { deletedAt: null }, orderBy: { sortOrder: "asc" } } },
        },
      },
    })
  },

  exists(db: DbClient, id: string): Promise<boolean> {
    return db.product.findUnique({ where: { id }, select: { id: true } }).then(Boolean)
  },

  /** `(store_id, sku)` is unique when sku is not null. */
  findByStoreAndSku(db: DbClient, storeId: string, sku: string): Promise<Product | null> {
    return db.product.findUnique({ where: { storeId_sku: { storeId, sku } } })
  },

  /** Includes the parent Category's `name` and a filtered count of active Modifier Groups — API_SPEC.md's list shape denormalizes `categoryName`/`modifierGroupCount` onto each row. */
  findManyByStore(
    db: DbClient,
    storeId: string,
    params: {
      where?: Prisma.ProductWhereInput
      orderBy?: Prisma.ProductOrderByWithRelationInput
      skip?: number
      take?: number
    } = {},
  ) {
    return db.product.findMany({
      where: { storeId, deletedAt: null, ...params.where },
      orderBy: params.orderBy ?? { sortOrder: "asc" },
      skip: params.skip,
      take: params.take,
      include: {
        category: { select: { name: true } },
        _count: { select: { modifierGroups: { where: { deletedAt: null } } } },
      },
    })
  },

  /**
   * Neutral count with a caller-supplied filter — e.g. used by the Service
   * layer to decide whether a Category can be soft-deleted. This repository
   * makes no judgment about which product `status` values count as "active";
   * that interpretation belongs to the Service.
   */
  count(db: DbClient, where: Prisma.ProductWhereInput): Promise<number> {
    return db.product.count({ where })
  },

  create(db: DbClient, data: Prisma.ProductCreateInput): Promise<Product> {
    return db.product.create({ data })
  },

  update(db: DbClient, id: string, data: Prisma.ProductUpdateInput): Promise<Product> {
    return db.product.update({ where: { id }, data })
  },

  softDelete(db: DbClient, id: string): Promise<Product> {
    return db.product.update({ where: { id }, data: { deletedAt: new Date() } })
  },
}
