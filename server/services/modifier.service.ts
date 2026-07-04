import "server-only"
import type { DbClient } from "../db"
import type { Modifier } from "../../generated/prisma/client"
import { modifierRepository, modifierGroupRepository } from "../repositories"
import { BadRequestError, ConflictError, NotFoundError } from "../lib/errors"

export interface CreateModifierInput {
  name: string
  priceAdjustment?: number
  sku?: string | null
  sortOrder?: number
  isActive?: boolean
}

export type UpdateModifierInput = Partial<CreateModifierInput>

/** Store + parent-ModifierGroup Isolation: masks a modifier belonging to another store or group as not-found. */
async function getModifierOrThrow(db: DbClient, storeId: string, modifierGroupId: string, id: string): Promise<Modifier> {
  const modifier = await modifierRepository.findById(db, id)
  if (!modifier || modifier.storeId !== storeId || modifier.modifierGroupId !== modifierGroupId) {
    throw new NotFoundError("MODIFIER_NOT_FOUND", "Modifier does not exist for this modifier group.")
  }
  return modifier
}

/** Mirrors product.service.ts's `assertCategoryBelongsToStore` for the same reason. */
async function assertModifierGroupBelongsToStore(db: DbClient, storeId: string, modifierGroupId: string): Promise<void> {
  const group = await modifierGroupRepository.findById(db, modifierGroupId)
  if (!group || group.storeId !== storeId || group.deletedAt) {
    throw new BadRequestError("MODIFIER_GROUP_NOT_FOUND", "Modifier group does not exist or belongs to another store.")
  }
}

async function assertNameAvailable(db: DbClient, modifierGroupId: string, name: string, excludeId?: string): Promise<void> {
  const existing = await modifierRepository.findByGroupAndName(db, modifierGroupId, name)
  if (existing && existing.id !== excludeId) {
    throw new ConflictError("MODIFIER_NAME_TAKEN", "A modifier with this name already exists in this group.")
  }
}

export const modifierService = {
  getById: getModifierOrThrow,
  listByGroup: modifierRepository.findManyByModifierGroup,

  async create(db: DbClient, storeId: string, modifierGroupId: string, input: CreateModifierInput): Promise<Modifier> {
    await assertModifierGroupBelongsToStore(db, storeId, modifierGroupId)
    await assertNameAvailable(db, modifierGroupId, input.name)
    return modifierRepository.create(db, {
      ...input,
      store: { connect: { id: storeId } },
      modifierGroup: { connect: { id: modifierGroupId } },
    })
  },

  async update(db: DbClient, storeId: string, modifierGroupId: string, id: string, input: UpdateModifierInput): Promise<Modifier> {
    const modifier = await getModifierOrThrow(db, storeId, modifierGroupId, id)
    if (input.name) await assertNameAvailable(db, modifierGroupId, input.name, id)
    return modifierRepository.update(db, id, input)
  },

  async softDelete(db: DbClient, storeId: string, modifierGroupId: string, id: string): Promise<Modifier> {
    await getModifierOrThrow(db, storeId, modifierGroupId, id)
    return modifierRepository.softDelete(db, id)
  },
}
