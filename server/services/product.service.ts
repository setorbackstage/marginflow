import "server-only"
import type { DbClient } from "../db"
import type { Prisma, Product } from "../../generated/prisma/client"
import { categoryRepository, productRepository, modifierGroupRepository } from "../repositories"
import { BadRequestError, ConflictError, NotFoundError } from "../lib/errors"
import { toNullableJsonInput } from "../lib/json"
import { modifierGroupService } from "./modifier-group.service"

export interface CreateProductInput {
  categoryId: string
  name: string
  description?: string | null
  price: number
  imageUrl?: string | null
  sku?: string | null
  type?: string
  status?: string
  sortOrder?: number
  availabilitySchedule?: Prisma.InputJsonValue | null
}

export type UpdateProductInput = Partial<CreateProductInput>

/** Store Isolation (API_SPEC.md): masks a product belonging to another store as not-found. */
async function getProductOrThrow(db: DbClient, storeId: string, id: string): Promise<Product> {
  const product = await productRepository.findById(db, id)
  if (!product || product.storeId !== storeId) throw new NotFoundError("PRODUCT_NOT_FOUND", "Product does not exist in this store.")
  return product
}

async function assertCategoryBelongsToStore(db: DbClient, storeId: string, categoryId: string): Promise<void> {
  const category = await categoryRepository.findById(db, categoryId)
  if (!category || category.storeId !== storeId || category.deletedAt) {
    throw new BadRequestError("CATEGORY_NOT_FOUND", "Category does not exist or belongs to another store.")
  }
}

async function assertSkuAvailable(db: DbClient, storeId: string, sku: string, excludeId?: string): Promise<void> {
  const existing = await productRepository.findByStoreAndSku(db, storeId, sku)
  if (existing && existing.id !== excludeId) {
    throw new ConflictError("SKU_TAKEN", "SKU already used by another product in this store.")
  }
}

/** API_SPEC.md `GET /products/:productId` — Store Isolation applies the same as `getProductOrThrow`. */
async function getProductWithModifierGroupsOrThrow(db: DbClient, storeId: string, id: string) {
  const product = await productRepository.findByIdWithModifierGroups(db, id)
  if (!product || product.storeId !== storeId) throw new NotFoundError("PRODUCT_NOT_FOUND", "Product does not exist in this store.")
  return product
}

export const productService = {
  getById: getProductOrThrow,
  getByIdWithModifierGroups: getProductWithModifierGroupsOrThrow,
  count: productRepository.count,
  listByStore: (
    db: DbClient,
    storeId: string,
    params: { where?: Prisma.ProductWhereInput; orderBy?: Prisma.ProductOrderByWithRelationInput; skip?: number; take?: number } = {},
  ) => productRepository.findManyByStore(db, storeId, params),

  async create(db: DbClient, storeId: string, input: CreateProductInput): Promise<Product> {
    await assertCategoryBelongsToStore(db, storeId, input.categoryId)
    if (input.sku) await assertSkuAvailable(db, storeId, input.sku)

    const { categoryId, ...rest } = input
    return productRepository.create(db, {
      ...rest,
      availabilitySchedule: toNullableJsonInput(input.availabilitySchedule),
      store: { connect: { id: storeId } },
      category: { connect: { id: categoryId } },
    })
  },

  /** Business Rule: changing price/status does not affect existing (snapshotted) Order Items. */
  async update(db: DbClient, storeId: string, id: string, input: UpdateProductInput): Promise<Product> {
    await getProductOrThrow(db, storeId, id)
    if (input.categoryId) await assertCategoryBelongsToStore(db, storeId, input.categoryId)
    if (input.sku) await assertSkuAvailable(db, storeId, input.sku, id)

    const { categoryId, ...rest } = input
    return productRepository.update(db, id, {
      ...rest,
      availabilitySchedule: toNullableJsonInput(input.availabilitySchedule),
      ...(categoryId ? { category: { connect: { id: categoryId } } } : {}),
    })
  },

  /** Cascades soft-delete to all Modifier Groups (and transitively Modifiers) — API_SPEC.md's documented behavior. */
  async softDelete(db: DbClient, storeId: string, id: string): Promise<Product> {
    await getProductOrThrow(db, storeId, id)
    const groups = await modifierGroupRepository.findManyByProduct(db, id)
    await Promise.all(groups.map((group) => modifierGroupService.softDelete(db, storeId, group.productId, group.id)))
    return productRepository.softDelete(db, id)
  },
}
