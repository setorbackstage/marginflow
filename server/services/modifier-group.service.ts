import "server-only"
import type { DbClient } from "../db"
import type { ModifierGroup } from "../../generated/prisma/client"
import { modifierGroupRepository, modifierRepository, productRepository } from "../repositories"
import { BadRequestError, ConflictError, NotFoundError } from "../lib/errors"
import { modifierService } from "./modifier.service"

export interface CreateModifierGroupInput {
  name: string
  description?: string | null
  isRequired: boolean
  minSelections: number
  maxSelections: number
  sortOrder?: number
  isActive?: boolean
}

export type UpdateModifierGroupInput = Partial<CreateModifierGroupInput>

/** Store + parent-Product Isolation: masks a group belonging to another store or product as not-found. */
async function getModifierGroupOrThrow(db: DbClient, storeId: string, productId: string, id: string): Promise<ModifierGroup> {
  const group = await modifierGroupRepository.findById(db, id)
  if (!group || group.storeId !== storeId || group.productId !== productId) {
    throw new NotFoundError("MODIFIER_GROUP_NOT_FOUND", "Modifier group does not exist for this product.")
  }
  return group
}

/** Mirrors product.service.ts's `assertCategoryBelongsToStore` for the same reason: a nested resource must not be created under a parent that doesn't belong to this store (or is already soft-deleted). */
async function assertProductBelongsToStore(db: DbClient, storeId: string, productId: string): Promise<void> {
  const product = await productRepository.findById(db, productId)
  if (!product || product.storeId !== storeId || product.deletedAt) {
    throw new BadRequestError("PRODUCT_NOT_FOUND", "Product does not exist or belongs to another store.")
  }
}

async function assertNameAvailable(db: DbClient, productId: string, name: string, excludeId?: string): Promise<void> {
  const existing = await modifierGroupRepository.findByProductAndName(db, productId, name)
  if (existing && existing.id !== excludeId) {
    throw new ConflictError("GROUP_NAME_TAKEN", "Modifier group name already exists for this product.")
  }
}

function assertSelectionRange(minSelections: number, maxSelections: number): void {
  if (minSelections > maxSelections) {
    throw new BadRequestError("MIN_GT_MAX_SELECTIONS", "minSelections must be less than or equal to maxSelections.")
  }
}

export const modifierGroupService = {
  getById: getModifierGroupOrThrow,
  listByProduct: modifierGroupRepository.findManyByProduct,

  async create(db: DbClient, storeId: string, productId: string, input: CreateModifierGroupInput): Promise<ModifierGroup> {
    await assertProductBelongsToStore(db, storeId, productId)
    assertSelectionRange(input.minSelections, input.maxSelections)
    await assertNameAvailable(db, productId, input.name)
    return modifierGroupRepository.create(db, {
      ...input,
      store: { connect: { id: storeId } },
      product: { connect: { id: productId } },
    })
  },

  async update(db: DbClient, storeId: string, productId: string, id: string, input: UpdateModifierGroupInput): Promise<ModifierGroup> {
    const group = await getModifierGroupOrThrow(db, storeId, productId, id)
    const minSelections = input.minSelections ?? group.minSelections
    const maxSelections = input.maxSelections ?? group.maxSelections
    assertSelectionRange(minSelections, maxSelections)
    if (input.name) await assertNameAvailable(db, productId, input.name, id)
    return modifierGroupRepository.update(db, id, input)
  },

  /** Cascades to all Modifiers in the group — API_SPEC.md's documented delete behavior. */
  async softDelete(db: DbClient, storeId: string, productId: string, id: string): Promise<ModifierGroup> {
    await getModifierGroupOrThrow(db, storeId, productId, id)
    const modifiers = await modifierRepository.findManyByModifierGroup(db, id)
    await Promise.all(modifiers.map((modifier) => modifierService.softDelete(db, storeId, id, modifier.id)))
    return modifierGroupRepository.softDelete(db, id)
  },
}
