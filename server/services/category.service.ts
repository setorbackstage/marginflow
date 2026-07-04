import "server-only"
import type { DbClient } from "../db"
import type { Category, Prisma } from "../../generated/prisma/client"
import { categoryRepository, productRepository } from "../repositories"
import { ConflictError, NotFoundError } from "../lib/errors"

export interface CreateCategoryInput {
  name: string
  description?: string | null
  imageUrl?: string | null
  sortOrder?: number
  isActive?: boolean
}

export type UpdateCategoryInput = Partial<CreateCategoryInput>

/** Store Isolation (API_SPEC.md): masks a category belonging to another store as not-found. */
async function getCategoryOrThrow(db: DbClient, storeId: string, id: string): Promise<Category> {
  const category = await categoryRepository.findById(db, id)
  if (!category || category.storeId !== storeId) throw new NotFoundError("CATEGORY_NOT_FOUND", "Category does not exist in this store.")
  return category
}

async function assertNameAvailable(db: DbClient, storeId: string, name: string, excludeId?: string): Promise<void> {
  const existing = await categoryRepository.findByStoreAndName(db, storeId, name)
  if (existing && existing.id !== excludeId) {
    throw new ConflictError("CATEGORY_NAME_TAKEN", "A category with this name already exists at this store.")
  }
}

export const categoryService = {
  getById: getCategoryOrThrow,
  listByStore: (db: DbClient, storeId: string, where?: Prisma.CategoryWhereInput) =>
    categoryRepository.findManyByStore(db, storeId, { where }),

  async create(db: DbClient, storeId: string, input: CreateCategoryInput): Promise<Category> {
    await assertNameAvailable(db, storeId, input.name)
    return categoryRepository.create(db, { ...input, store: { connect: { id: storeId } } })
  },

  async update(db: DbClient, storeId: string, id: string, input: UpdateCategoryInput): Promise<Category> {
    await getCategoryOrThrow(db, storeId, id)
    if (input.name) await assertNameAvailable(db, storeId, input.name, id)
    return categoryRepository.update(db, id, input)
  },

  /** Business Rule 31: a category with active (non-deleted) products cannot be soft-deleted. */
  async softDelete(db: DbClient, storeId: string, id: string): Promise<Category> {
    await getCategoryOrThrow(db, storeId, id)
    const activeProductCount = await productRepository.count(db, { categoryId: id, deletedAt: null })
    if (activeProductCount > 0) {
      throw new ConflictError(
        "CATEGORY_HAS_ACTIVE_PRODUCTS",
        "Cannot delete a category that has active products. Reassign or deactivate all products first.",
      )
    }
    return categoryRepository.softDelete(db, id)
  },
}
