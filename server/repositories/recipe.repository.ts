import "server-only"
import type { DbClient } from "../db"
import type { Prisma, Recipe } from "../../generated/prisma/client"

export type RecipeWithItems = Prisma.RecipeGetPayload<{
  include: { items: { include: { ingredient: true } } }
}>

/** Pure data access for the `recipes` and `recipe_items` tables. */
export const recipeRepository = {
  findByProductId(db: DbClient, productId: string): Promise<RecipeWithItems | null> {
    return db.recipe.findUnique({
      where: { productId },
      include: { items: { include: { ingredient: true } } },
    })
  },

  findManyByProductIds(db: DbClient, productIds: string[]): Promise<RecipeWithItems[]> {
    return db.recipe.findMany({
      where: { productId: { in: productIds } },
      include: { items: { include: { ingredient: true } } },
    })
  },

  /** "Which recipes use this ingredient" — deletion guard (Business Rule 44). */
  findManyByIngredientId(db: DbClient, ingredientId: string): Promise<RecipeWithItems[]> {
    return db.recipe.findMany({
      where: { items: { some: { ingredientId } } },
      include: { items: { include: { ingredient: true } } },
    })
  },

  countByIngredientId(db: DbClient, ingredientId: string): Promise<number> {
    return db.recipe.count({ where: { items: { some: { ingredientId } } } })
  },

  create(
    db: DbClient,
    data: Prisma.RecipeCreateInput,
    items: { ingredientId: string; quantity: number; wastePct: number }[],
  ): Promise<Recipe> {
    return db.recipe.create({
      data: {
        ...data,
        items: { create: items.map((item) => ({ ...item })) },
      },
    })
  },

  /** PUT semantics: header updated, item list atomically replaced. */
  async replace(
    db: DbClient,
    id: string,
    data: Prisma.RecipeUpdateInput,
    items: { ingredientId: string; quantity: number; wastePct: number }[],
  ): Promise<Recipe> {
    await db.recipeItem.deleteMany({ where: { recipeId: id } })
    return db.recipe.update({
      where: { id },
      data: {
        ...data,
        items: { create: items.map((item) => ({ ...item })) },
      },
    })
  },

  delete(db: DbClient, id: string): Promise<Recipe> {
    return db.recipe.delete({ where: { id } })
  },
}
