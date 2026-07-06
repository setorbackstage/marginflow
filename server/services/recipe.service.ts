import "server-only"
import type { DbClient } from "../db"
import type { Product } from "../../generated/prisma/client"
import { ingredientRepository, productRepository, recipeRepository, type RecipeWithItems } from "../repositories"
import { ConflictError, NotFoundError } from "../lib/errors"

export interface RecipeItemInput {
  ingredientId: string
  quantity: number
  wastePct?: number
}

export interface UpsertRecipeInput {
  yieldQuantity?: number
  notes?: string | null
  items: RecipeItemInput[]
}

export interface RecipeCostItem {
  id: string
  ingredientId: string
  ingredientName: string
  ingredientUnit: string
  quantity: number
  wastePct: number
  /** quantity × (1 + wastePct/100) ÷ yieldQuantity */
  effectiveQuantityPerUnit: number
  /** effectiveQuantityPerUnit × ingredient.costPerUnit — decimal cents. */
  itemCostPerUnit: number
}

export interface RecipeWithCosts {
  id: string
  storeId: string
  productId: string
  yieldQuantity: number
  notes: string | null
  items: RecipeCostItem[]
  /** Σ itemCostPerUnit — decimal cents, computed at read time (Business Rule 45). */
  costPerUnit: number
  productPrice: number
  /** (price − cost) ÷ price × 100; null when price is 0. */
  marginPct: number | null
  createdAt: Date
  updatedAt: Date
}

async function getProductOrThrow(db: DbClient, storeId: string, productId: string): Promise<Product> {
  const product = await productRepository.findById(db, productId)
  if (!product || product.storeId !== storeId || product.deletedAt) {
    throw new NotFoundError("PRODUCT_NOT_FOUND", "Product does not exist in this store.")
  }
  return product
}

function toRecipeWithCosts(recipe: RecipeWithItems, productPrice: number): RecipeWithCosts {
  const yieldQuantity = Number(recipe.yieldQuantity)
  const items = recipe.items.map((item) => {
    const quantity = Number(item.quantity)
    const wastePct = Number(item.wastePct)
    const effectiveQuantityPerUnit = (quantity * (1 + wastePct / 100)) / yieldQuantity
    return {
      id: item.id,
      ingredientId: item.ingredientId,
      ingredientName: item.ingredient.name,
      ingredientUnit: item.ingredient.unit,
      quantity,
      wastePct,
      effectiveQuantityPerUnit,
      itemCostPerUnit: effectiveQuantityPerUnit * Number(item.ingredient.costPerUnit),
    }
  })
  const costPerUnit = items.reduce((sum, item) => sum + item.itemCostPerUnit, 0)
  return {
    id: recipe.id,
    storeId: recipe.storeId,
    productId: recipe.productId,
    yieldQuantity,
    notes: recipe.notes,
    items,
    costPerUnit,
    productPrice,
    marginPct: productPrice > 0 ? ((productPrice - costPerUnit) / productPrice) * 100 : null,
    createdAt: recipe.createdAt,
    updatedAt: recipe.updatedAt,
  }
}

export const recipeService = {
  async getByProduct(db: DbClient, storeId: string, productId: string): Promise<RecipeWithCosts> {
    const product = await getProductOrThrow(db, storeId, productId)
    const recipe = await recipeRepository.findByProductId(db, productId)
    if (!recipe) throw new NotFoundError("RECIPE_NOT_FOUND", "The product has no ficha técnica.")
    return toRecipeWithCosts(recipe, product.price)
  },

  /**
   * PUT semantics: the submitted item list atomically replaces the previous
   * one. Returns `created: true` when the product had no recipe before.
   */
  async upsert(
    db: DbClient,
    storeId: string,
    productId: string,
    input: UpsertRecipeInput,
  ): Promise<{ recipe: RecipeWithCosts; created: boolean }> {
    const product = await getProductOrThrow(db, storeId, productId)

    const ingredientIds = input.items.map((item) => item.ingredientId)
    if (new Set(ingredientIds).size !== ingredientIds.length) {
      throw new ConflictError("DUPLICATE_RECIPE_INGREDIENT", "The same ingredient appears twice in the recipe.")
    }
    const ingredients = await ingredientRepository.findManyByIds(db, storeId, ingredientIds)
    if (ingredients.length !== ingredientIds.length) {
      throw new NotFoundError("INGREDIENT_NOT_FOUND", "An item references a non-existent or deleted ingredient.")
    }

    const items = input.items.map((item) => ({
      ingredientId: item.ingredientId,
      quantity: item.quantity,
      wastePct: item.wastePct ?? 0,
    }))
    const existing = await recipeRepository.findByProductId(db, productId)
    if (existing) {
      await recipeRepository.replace(
        db,
        existing.id,
        { yieldQuantity: input.yieldQuantity ?? 1, notes: input.notes ?? null },
        items,
      )
    } else {
      await recipeRepository.create(
        db,
        {
          yieldQuantity: input.yieldQuantity ?? 1,
          notes: input.notes ?? null,
          store: { connect: { id: storeId } },
          product: { connect: { id: productId } },
        },
        items,
      )
    }

    const saved = await recipeRepository.findByProductId(db, productId)
    if (!saved) throw new NotFoundError("RECIPE_NOT_FOUND", "The product has no ficha técnica.")
    return { recipe: toRecipeWithCosts(saved, product.price), created: !existing }
  },

  /** Business Rule 42: the product simply stops driving automatic consumption. */
  async delete(db: DbClient, storeId: string, productId: string): Promise<void> {
    await getProductOrThrow(db, storeId, productId)
    const recipe = await recipeRepository.findByProductId(db, productId)
    if (!recipe) throw new NotFoundError("RECIPE_NOT_FOUND", "The product has no ficha técnica.")
    await recipeRepository.delete(db, recipe.id)
  },
}
