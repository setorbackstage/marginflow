import "server-only"
import type { DbClient } from "../db"
import type { Ingredient, Prisma } from "../../generated/prisma/client"
import { ingredientRepository, recipeRepository, stockMovementRepository } from "../repositories"
import { ConflictError, NotFoundError } from "../lib/errors"

export interface CreateIngredientInput {
  name: string
  unit: "G" | "ML" | "UN"
  costPerUnit?: number
  /** Opening balance. Omit for 0 (legacy behavior). */
  currentStock?: number
  minStock?: number | null
  status?: "ACTIVE" | "INACTIVE"
  category?: string | null
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

const STALE_DAYS = 30
const INSIGHT_WINDOW_DAYS = 30
const INSIGHT_LIMIT = 5

export interface StaleIngredient {
  ingredientId: string
  ingredientName: string
  unit: string
  currentStock: number
  daysSinceLastMovement: number | null
}

export interface ConsumptionInsight {
  ingredientId: string
  ingredientName: string
  unit: string
  totalConsumed: number
  totalCost: number
}

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
      currentStock: input.currentStock ?? 0,
      minStock: input.minStock ?? null,
      status: input.status ?? "ACTIVE",
      category: input.category ?? null,
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
      ...(input.category !== undefined ? { category: input.category } : {}),
    })
  },

  /**
   * Sprint 3 "Alertas" (Produto parado): active ingredients with no stock
   * movement in the last `STALE_DAYS` days (or none ever) — a purely
   * read-derived signal, no new table, same spirit as `listAlerts`.
   */
  async listStale(db: DbClient, storeId: string): Promise<StaleIngredient[]> {
    const cutoff = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000)
    const [candidates, lastMovements] = await Promise.all([
      ingredientRepository.findManyByStore(db, storeId, { where: { status: "ACTIVE" } }),
      stockMovementRepository.maxCreatedAtByIngredient(db, storeId),
    ])
    const lastMovementById = new Map(lastMovements.map((row) => [row.ingredientId, row._max.createdAt]))

    return candidates
      .map((ingredient) => ({ ingredient, lastMovementAt: lastMovementById.get(ingredient.id) ?? null }))
      .filter(({ lastMovementAt }) => !lastMovementAt || lastMovementAt < cutoff)
      .map(({ ingredient, lastMovementAt }) => ({
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        unit: ingredient.unit,
        currentStock: Number(ingredient.currentStock),
        daysSinceLastMovement: lastMovementAt ? Math.floor((Date.now() - lastMovementAt.getTime()) / (24 * 60 * 60 * 1000)) : null,
      }))
      .sort((a, b) => (b.daysSinceLastMovement ?? Infinity) - (a.daysSinceLastMovement ?? Infinity))
  },

  /** Sprint 3 "Alertas" (Maior consumo / Maior custo) over the trailing `INSIGHT_WINDOW_DAYS`. */
  async listTopConsumption(db: DbClient, storeId: string): Promise<{ byQuantity: ConsumptionInsight[]; byCost: ConsumptionInsight[] }> {
    const from = new Date(Date.now() - INSIGHT_WINDOW_DAYS * 24 * 60 * 60 * 1000)
    const rows = await stockMovementRepository.findConsumptionByIngredient(db, storeId, from, new Date())

    const totals = new Map<string, { totalConsumed: number; totalCost: number }>()
    for (const row of rows) {
      const consumed = Math.abs(Number(row.quantityDelta))
      const cost = consumed * Number(row.unitCost)
      const current = totals.get(row.ingredientId) ?? { totalConsumed: 0, totalCost: 0 }
      totals.set(row.ingredientId, { totalConsumed: current.totalConsumed + consumed, totalCost: current.totalCost + cost })
    }
    if (totals.size === 0) return { byQuantity: [], byCost: [] }

    const ingredients = await ingredientRepository.findManyByIds(db, storeId, [...totals.keys()])
    const ingredientById = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]))

    const insights: ConsumptionInsight[] = [...totals.entries()]
      .map(([ingredientId, totalsForIngredient]) => {
        const ingredient = ingredientById.get(ingredientId)
        return ingredient
          ? {
              ingredientId,
              ingredientName: ingredient.name,
              unit: ingredient.unit,
              totalConsumed: totalsForIngredient.totalConsumed,
              totalCost: Math.round(totalsForIngredient.totalCost),
            }
          : null
      })
      .filter((insight): insight is ConsumptionInsight => insight !== null)

    return {
      byQuantity: [...insights].sort((a, b) => b.totalConsumed - a.totalConsumed).slice(0, INSIGHT_LIMIT),
      byCost: [...insights].sort((a, b) => b.totalCost - a.totalCost).slice(0, INSIGHT_LIMIT),
    }
  },

  /**
   * BUG-05 fix: manual stock entry / adjustment / loss. Records a StockMovement
   * (type ENTRY/ADJUSTMENT/LOSS) and applies the delta to currentStock atomically.
   * There was previously no API path to record incoming merchandise or correct
   * a wrong balance even though the `inventory:adjust` permission existed.
   */
  async adjustStock(
    db: DbClient,
    storeId: string,
    actorUserId: string,
    input: { ingredientId: string; quantityDelta: number; type: "ENTRY" | "ADJUSTMENT" | "LOSS"; reason: string },
  ): Promise<Ingredient> {
    const ingredient = await getIngredientOrThrow(db, storeId, input.ingredientId)

    const result = await db.$transaction(async (tx) => {
      const updated = await ingredientRepository.update(tx, ingredient.id, {
        currentStock: { increment: input.quantityDelta },
      })
      await stockMovementRepository.create(tx, {
        store: { connect: { id: storeId } },
        ingredient: { connect: { id: ingredient.id } },
        type: input.type,
        quantityDelta: input.quantityDelta,
        unitCost: ingredient.costPerUnit,
        reason: input.reason,
        createdByUserId: actorUserId,
      })
      return updated
    })

    return result
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