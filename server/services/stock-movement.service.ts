import "server-only"
import type { DbClient } from "../db"
import type { Ingredient, Prisma, StockMovement } from "../../generated/prisma/client"
import { ingredientRepository, recipeRepository, stockMovementRepository } from "../repositories"
import { BadRequestError, NotFoundError } from "../lib/errors"
import { eventBus, createEvent } from "../lib/events"

export type ManualMovementType = "ENTRY" | "EXIT" | "ADJUSTMENT" | "LOSS"

export interface CreateManualMovementInput {
  ingredientId: string
  type: ManualMovementType
  /** Absolute quantity; the sign is derived from `type` (+ `direction`). */
  quantity: number
  /** Required for ADJUSTMENT. */
  direction?: "INCREASE" | "DECREASE"
  /** Required for ADJUSTMENT and LOSS. */
  reason?: string | null
  /** ENTRY only: also updates the ingredient's cost_per_unit (latest-cost strategy). */
  costPerUnit?: number
}

/** Quantities are NUMERIC(14,3) — normalize JS float noise to 3 decimals. */
function round3(value: number): number {
  return Math.round(value * 1000) / 1000
}

function signedDelta(input: CreateManualMovementInput): number {
  const quantity = round3(input.quantity)
  switch (input.type) {
    case "ENTRY":
      return quantity
    case "EXIT":
    case "LOSS":
      return -quantity
    case "ADJUSTMENT":
      return input.direction === "DECREASE" ? -quantity : quantity
  }
}

/**
 * Writes one movement and its balance change in the same transaction
 * (Business Rule 38), then publishes stock.movement_created and — when the
 * balance crosses from above min_stock to at-or-below it (edge-triggered) —
 * stock.low.
 */
async function appendMovement(
  db: DbClient,
  ingredient: Ingredient,
  data: {
    type: string
    quantityDelta: number
    unitCost: number
    orderId?: string | null
    reason?: string | null
    createdByUserId?: string | null
  },
): Promise<StockMovement> {
  const before = Number(ingredient.currentStock)
  const after = round3(before + data.quantityDelta)

  const movement = await stockMovementRepository.create(db, {
    type: data.type,
    quantityDelta: data.quantityDelta,
    unitCost: data.unitCost,
    reason: data.reason ?? null,
    store: { connect: { id: ingredient.storeId } },
    ingredient: { connect: { id: ingredient.id } },
    ...(data.orderId ? { order: { connect: { id: data.orderId } } } : {}),
    ...(data.createdByUserId ? { createdByUser: { connect: { id: data.createdByUserId } } } : {}),
  })
  await ingredientRepository.incrementStock(db, ingredient.id, data.quantityDelta)

  await eventBus.publish(
    createEvent("stock.movement_created", ingredient.storeId, data.createdByUserId ?? null, {
      movementId: movement.id,
      ingredientId: ingredient.id,
      ingredientName: ingredient.name,
      type: data.type,
      quantityDelta: data.quantityDelta,
      unitCost: data.unitCost,
      currentStock: after,
      orderId: data.orderId ?? null,
    }),
    db,
  )

  const minStock = ingredient.minStock === null ? null : Number(ingredient.minStock)
  if (minStock !== null && before > minStock && after <= minStock) {
    await eventBus.publish(
      createEvent("stock.low", ingredient.storeId, null, {
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        unit: ingredient.unit,
        currentStock: after,
        minStock,
      }),
      db,
    )
  }

  return movement
}

export const stockMovementService = {
  listByStore: (
    db: DbClient,
    storeId: string,
    params: { where?: Prisma.StockMovementWhereInput; skip?: number; take?: number } = {},
  ) => stockMovementRepository.findManyByStore(db, storeId, params),

  count: (db: DbClient, storeId: string, where?: Prisma.StockMovementWhereInput) =>
    stockMovementRepository.count(db, storeId, where),

  cmvForPeriod: (db: DbClient, storeId: string, from: Date, to: Date) =>
    stockMovementRepository.sumCmv(db, storeId, from, to),

  /** Manual movements only — SALE_* types are reserved for the event consumers below. */
  async createManual(
    db: DbClient,
    storeId: string,
    input: CreateManualMovementInput,
    actorUserId: string,
  ): Promise<{ movement: StockMovement; currentStock: number }> {
    const ingredient = await ingredientRepository.findById(db, input.ingredientId)
    if (!ingredient || ingredient.storeId !== storeId || ingredient.deletedAt) {
      throw new NotFoundError("INGREDIENT_NOT_FOUND", "Ingredient does not exist in this store.")
    }

    const delta = signedDelta(input)
    const before = Number(ingredient.currentStock)
    const after = round3(before + delta)
    // Business Rule 41: manual movements may not drive stock negative
    // (automatic consumption may — reality wins; typos do not).
    if (after < 0) {
      throw new BadRequestError(
        "INSUFFICIENT_STOCK",
        `Movement would drive stock to ${after}. Current stock is ${before}.`,
      )
    }

    let unitCost = Number(ingredient.costPerUnit)
    if (input.type === "ENTRY" && input.costPerUnit !== undefined) {
      await ingredientRepository.update(db, ingredient.id, { costPerUnit: input.costPerUnit })
      unitCost = input.costPerUnit
    }

    const movement = await appendMovement(db, ingredient, {
      type: input.type,
      quantityDelta: delta,
      unitCost,
      reason: input.reason ?? null,
      createdByUserId: actorUserId,
    })
    return { movement, currentStock: after }
  },
}

// Business Rule 39: automatic consumption happens exactly once per Order, at
// confirmation, inside the same transaction as the status change (this
// listener receives the confirmation transaction's `db`). Idempotency:
// existing SALE_CONSUMPTION movements for the order short-circuit the
// consumer, and the (order_id, ingredient_id, type) unique index backs the
// same guarantee at the database level.
eventBus.on("order.confirmed", "stock-movement.service:order.confirmed", async (event, db) => {
  const existing = await stockMovementRepository.findManyByOrder(db, event.payload.orderId, "SALE_CONSUMPTION")
  if (existing.length > 0) return

  const productIds = [...new Set(event.payload.items.map((item) => item.productId).filter((id): id is string => id !== null))]
  if (productIds.length === 0) return
  const recipes = await recipeRepository.findManyByProductIds(db, productIds)
  if (recipes.length === 0) return // Business Rule 42: no recipe, no consumption, no error.
  const recipeByProduct = new Map(recipes.map((recipe) => [recipe.productId, recipe]))

  // Aggregate effective consumption per ingredient across all order items.
  const totals = new Map<string, number>()
  for (const item of event.payload.items) {
    const recipe = item.productId ? recipeByProduct.get(item.productId) : undefined
    if (!recipe) continue
    const yieldQuantity = Number(recipe.yieldQuantity)
    for (const recipeItem of recipe.items) {
      const perUnit = (Number(recipeItem.quantity) * (1 + Number(recipeItem.wastePct) / 100)) / yieldQuantity
      const previous = totals.get(recipeItem.ingredientId) ?? 0
      totals.set(recipeItem.ingredientId, previous + perUnit * item.quantity)
    }
  }
  if (totals.size === 0) return

  const ingredients = await ingredientRepository.findManyByIds(db, event.storeId, [...totals.keys()])
  for (const ingredient of ingredients) {
    const consumed = Math.round((totals.get(ingredient.id) ?? 0) * 1000) / 1000
    if (consumed <= 0) continue
    await appendMovement(db, ingredient, {
      type: "SALE_CONSUMPTION",
      quantityDelta: -consumed,
      unitCost: Number(ingredient.costPerUnit),
      orderId: event.payload.orderId,
    })
  }
})

// Business Rule 40: reversal only when the kitchen had not started
// (previousStatus = CONFIRMED). Mirrors the order's SALE_CONSUMPTION
// movements, reusing their cost snapshots so CMV nets to zero for the
// cancelled order. Idempotent: existing reversals short-circuit.
eventBus.on("order.cancelled", "stock-movement.service:order.cancelled", async (event, db) => {
  if (event.payload.previousStatus !== "CONFIRMED") return

  const consumptions = await stockMovementRepository.findManyByOrder(db, event.payload.orderId, "SALE_CONSUMPTION")
  if (consumptions.length === 0) return
  const reversals = await stockMovementRepository.findManyByOrder(db, event.payload.orderId, "SALE_REVERSAL")
  if (reversals.length > 0) return

  // Batch-fetch all ingredients in one query, same pattern as order.confirmed handler above.
  const ingredientIds = [...new Set(consumptions.map((c) => c.ingredientId))]
  const ingredients = await ingredientRepository.findManyByIds(db, event.storeId, ingredientIds)
  const ingredientMap = new Map(ingredients.map((i) => [i.id, i]))

  for (const consumption of consumptions) {
    const ingredient = ingredientMap.get(consumption.ingredientId)
    if (!ingredient) continue
    await appendMovement(db, ingredient, {
      type: "SALE_REVERSAL",
      quantityDelta: Math.abs(Number(consumption.quantityDelta)),
      unitCost: Number(consumption.unitCost),
      orderId: event.payload.orderId,
    })
  }
})
