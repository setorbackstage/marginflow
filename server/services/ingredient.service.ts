import "server-only"
import type { DbClient } from "../db"
import type { Ingredient, Prisma } from "../../generated/prisma/client"
import { ingredientRepository, recipeRepository } from "../repositories"
import { ConflictError, NotFoundError } from "../lib/errors"

export interface CreateIngredientInput {
  name: string
  unit: "G" | "ML" | "UN"
  costPerUnit?: number
  minStock?: number | null
  status?: "ACTIVE" | "INACTIVE"
}

/** `unit` is immutable and `currentStock` only changes through movements. */
export type UpdateIngredientInput = Partial<Omit<CreateIngredientInput, "unit">>

export type AlertSeverity = "NEGATIVE" | "OUT" | "LOW"

export interface LowStockAlert {
  ingredientId: string
  ingredientName: string
  unit: string
  currentStock: number
  minStock: number
  severity: AlertSeverity
}

/** Store Isolation (API_SPEC.md): masks an ingredient of another store as not-found. */
async function getIngredientOrThrow(db: DbClient, storeId: string, id: string): Promise<Ingredient> {
  const ingredient = await ingredientRepository.findById(db, id)
  if (!ingredient || ingredient.storeId !== storeId || ingredient.deletedAt) {
    throw new NotFoundError("INGREDIENT_NOT_FOUND", "Ingredient does not exist in this store.")
  }
  return ingredient
}

async function assertNameAvailable(db: DbClient, storeId: string, name: string, excludeId?: string): Promise<void> {
  const existing = await ingredientRepository.findByStoreAndName(db, storeId, name)
  if (existing && existing.id !== excludeId) {
    throw new ConflictError("INGREDIENT_NAME_TAKEN", "An ingredient with this name already exists at this store.")
  }
}

function toSeverity(currentStock: number): AlertSeverity {
  if (currentStock < 0) return "NEGATIVE"
  if (currentStock === 0) return "OUT"
  return "LOW"
}

const SEVERITY_ORDER: Record<AlertSeverity, number> = { NEGATIVE: 0, OUT: 1, LOW: 2 }

export const ingredientService = {
  getById: getIngredientOrThrow,

  listByStore: (
    db: DbClient,
    storeId: string,
    params: { where?: Prisma.IngredientWhereInput; skip?: number; take?: number } = {},
  ) => ingredientRepository.findManyByStore(db, storeId, params),

  count: (db: DbClient, storeId: string, where?: Prisma.IngredientWhereInput) =>
    ingredientRepository.count(db, storeId, where),

  listLowStock: (db: DbClient, storeId: string) => ingredientRepository.findLowStock(db, storeId),
  countLowStock: (db: DbClient, storeId: string) => ingredientRepository.countLowStock(db, storeId),

  /** Recipes that reference the ingredient — for the detail response's `usedInRecipes`. */
  listUsages: (db: DbClient, ingredientId: string) => recipeRepository.findManyByIngredientId(db, ingredientId),

  /**
   * Alerts are derived state (API_SPEC.md) — computed here, no table.
   * Sorted worst first: NEGATIVE, OUT, LOW.
   */
  async listAlerts(db: DbClient, storeId: string): Promise<LowStockAlert[]> {
    const lowIngredients = await ingredientRepository.findLowStock(db, storeId)
    return lowIngredients
      .map((ingredient) => ({
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        unit: ingredient.unit,
        currentStock: Number(ingredient.currentStock),
        minStock: Number(ingredient.minStock),
        severity: toSeverity(Number(ingredient.currentStock)),
      }))
      .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || a.currentStock - b.currentStock)
  },

  /** Initial stock is always 0 — opening balances are recorded as ENTRY movements. */
  async create(db: DbClient, storeId: string, input: CreateIngredientInput): Promise<Ingredient> {
    await assertNameAvailable(db, storeId, input.name)
    return ingredientRepository.create(db, {
      name: input.name,
      unit: input.unit,
      costPerUnit: input.costPerUnit ?? 0,
      minStock: input.minStock ?? null,
      status: input.status ?? "ACTIVE",
      store: { connect: { id: storeId } },
    })
  },

  async update(db: DbClient, storeId: string, id: string, input: UpdateIngredientInput): Promise<Ingredient> {
    await getIngredientOrThrow(db, storeId, id)
    if (input.name) await assertNameAvailable(db, storeId, input.name, id)
    return ingredientRepository.update(db, id, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.costPerUnit !== undefined ? { costPerUnit: input.costPerUnit } : {}),
      ...(input.minStock !== undefined ? { minStock: input.minStock } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    })
  },

  /** Business Rule 44: blocked while any recipe references the ingredient. */
  async softDelete(db: DbClient, storeId: string, id: string): Promise<Ingredient> {
    await getIngredientOrThrow(db, storeId, id)
    const usageCount = await recipeRepository.countByIngredientId(db, id)
    if (usageCount > 0) {
      throw new ConflictError(
        "INGREDIENT_IN_USE",
        "The ingredient appears in one or more recipes. Remove it from all recipes first, or set it INACTIVE instead.",
      )
    }
    return ingredientRepository.softDelete(db, id)
  },
}
