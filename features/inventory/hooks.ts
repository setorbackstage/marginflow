"use client"

import { useMutation, useQuery, useQueries, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import { toast } from "sonner"
import { isApiError } from "@/lib/api"
import { useActiveStoreId } from "@/features/auth"
import { ingredientsApi, movementsApi, alertsApi, insightsApi, recipesApi } from "./api"
import type { IngredientInput, IngredientListParams, MovementInput, MovementListParams, RecipeInput } from "./types"

const keys = {
  ingredients: (storeId: string) => ["ingredients", storeId] as const,
  ingredientList: (storeId: string, params: IngredientListParams) => ["ingredients", storeId, "list", params] as const,
  ingredient: (storeId: string, ingredientId: string) => ["ingredients", storeId, "detail", ingredientId] as const,
  movements: (storeId: string) => ["stock-movements", storeId] as const,
  movementList: (storeId: string, params: MovementListParams) => ["stock-movements", storeId, params] as const,
  alerts: (storeId: string) => ["stock-alerts", storeId] as const,
  insights: (storeId: string) => ["stock-insights", storeId] as const,
  recipe: (storeId: string, productId: string) => ["recipes", storeId, productId] as const,
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

/** Stock changed → balances, ledger and alerts are all stale. */
function invalidateStock(queryClient: ReturnType<typeof useQueryClient>, storeId: string) {
  queryClient.invalidateQueries({ queryKey: keys.ingredients(storeId) })
  queryClient.invalidateQueries({ queryKey: keys.movements(storeId) })
  queryClient.invalidateQueries({ queryKey: keys.alerts(storeId) })
}

// ─────────────────────────── Ingredients ───────────────────────────

export function useIngredients(params: IngredientListParams) {
  const storeId = useActiveStoreId()
  return useQuery({
    queryKey: keys.ingredientList(storeId, params),
    enabled: Boolean(storeId),
    queryFn: () => ingredientsApi.list(storeId, params),
    placeholderData: keepPreviousData,
  })
}

export interface InventoryValue {
  /** Σ currentStock × costPerUnit over active ingredients, in decimal cents. */
  total: number
  /** True when the store has more active ingredients than fit in one 100-item page (approximation). */
  isApproximate: boolean
}

/**
 * "Valor em estoque" — no aggregate endpoint exists, so this reads one
 * large page (the API's max perPage) and sums client-side. Flags itself as
 * approximate past 100 active ingredients rather than silently under-count.
 */
export function useInventoryValue() {
  const storeId = useActiveStoreId()
  return useQuery({
    queryKey: keys.ingredients(storeId).concat("total-value"),
    enabled: Boolean(storeId),
    queryFn: async (): Promise<InventoryValue> => {
      const page = await ingredientsApi.list(storeId, { page: 1, perPage: 100, status: "ACTIVE" })
      // Negative stock (a count error, Business Rule 41) never contributes negative value.
      const total = page.items.reduce((sum, ingredient) => sum + Math.max(0, ingredient.currentStock) * ingredient.costPerUnit, 0)
      return { total, isApproximate: page.pagination.total > page.items.length }
    },
  })
}

export function useIngredient(ingredientId: string | undefined) {
  const storeId = useActiveStoreId()
  return useQuery({
    queryKey: keys.ingredient(storeId, ingredientId ?? ""),
    enabled: Boolean(storeId) && Boolean(ingredientId),
    queryFn: () => ingredientsApi.get(storeId, ingredientId as string),
  })
}

export function useCreateIngredient() {
  const storeId = useActiveStoreId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: IngredientInput) => ingredientsApi.create(storeId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.ingredients(storeId) })
      toast.success("Insumo criado.")
    },
    onError: (error) => toast.error(errorMessage(error, "Não foi possível criar o insumo.")),
  })
}

export function useUpdateIngredient() {
  const storeId = useActiveStoreId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ ingredientId, input }: { ingredientId: string; input: Partial<IngredientInput> }) =>
      ingredientsApi.update(storeId, ingredientId, input),
    onSuccess: () => {
      invalidateStock(queryClient, storeId)
      toast.success("Insumo atualizado.")
    },
    onError: (error) => toast.error(errorMessage(error, "Não foi possível atualizar o insumo.")),
  })
}

export function useDeleteIngredient() {
  const storeId = useActiveStoreId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ingredientId: string) => ingredientsApi.remove(storeId, ingredientId),
    onSuccess: () => {
      invalidateStock(queryClient, storeId)
      toast.success("Insumo excluído.")
    },
    onError: (error) =>
      toast.error(
        isApiError(error) && error.code === "INGREDIENT_IN_USE"
          ? "O insumo é usado em fichas técnicas. Remova-o das fichas ou inative-o."
          : errorMessage(error, "Não foi possível excluir o insumo."),
      ),
  })
}

// ─────────────────────────── Movements ───────────────────────────

export function useMovements(params: MovementListParams) {
  const storeId = useActiveStoreId()
  return useQuery({
    queryKey: keys.movementList(storeId, params),
    enabled: Boolean(storeId),
    queryFn: () => movementsApi.list(storeId, params),
    placeholderData: keepPreviousData,
  })
}

const MOVEMENT_TYPE_TOAST: Record<string, string> = {
  ENTRY: "Entrada de estoque registrada.",
  EXIT: "Saída de estoque registrada.",
  LOSS: "Perda de estoque registrada.",
  ADJUSTMENT: "Ajuste de estoque registrado.",
}

export function useCreateMovement() {
  const storeId = useActiveStoreId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: MovementInput) => movementsApi.create(storeId, input),
    onSuccess: (_data, variables) => {
      invalidateStock(queryClient, storeId)
      toast.success(MOVEMENT_TYPE_TOAST[variables.type] ?? "Movimentação registrada.")
    },
    onError: (error) =>
      toast.error(
        isApiError(error) && error.code === "INSUFFICIENT_STOCK"
          ? "Estoque insuficiente — a movimentação deixaria o saldo negativo."
          : errorMessage(error, "Não foi possível registrar a movimentação."),
      ),
  })
}

// ─────────────────────────── Alerts ───────────────────────────

export function useStockAlerts() {
  const storeId = useActiveStoreId()
  return useQuery({
    queryKey: keys.alerts(storeId),
    enabled: Boolean(storeId),
    queryFn: () => alertsApi.list(storeId),
  })
}

/** Sprint 3 "Alertas": stale ingredients + consumption/cost leaders, trailing 30 days. */
export function useInventoryInsights() {
  const storeId = useActiveStoreId()
  return useQuery({
    queryKey: keys.insights(storeId),
    enabled: Boolean(storeId),
    queryFn: () => insightsApi.get(storeId),
  })
}

// ─────────────────────────── Recipes (Ficha Técnica) ───────────────────────────

/** 404 RECIPE_NOT_FOUND is a normal state (product has no ficha) — mapped to null, not an error. */
export function useRecipe(productId: string | undefined) {
  const storeId = useActiveStoreId()
  return useQuery({
    queryKey: keys.recipe(storeId, productId ?? ""),
    enabled: Boolean(storeId) && Boolean(productId),
    queryFn: async () => {
      try {
        return await recipesApi.get(storeId, productId as string)
      } catch (error) {
        if (isApiError(error) && error.code === "RECIPE_NOT_FOUND") return null
        throw error
      }
    },
  })
}

/**
 * Bulk "does this product have a ficha técnica?" check for a visible page of
 * products (bounded — one page, never the whole catalog). Uses the exact
 * same query key as `useRecipe`, so opening a product's RecipeSheet later
 * reuses this cache instead of refetching.
 */
export function useRecipesPresence(productIds: string[]) {
  const storeId = useActiveStoreId()
  const results = useQueries({
    queries: productIds.map((productId) => ({
      queryKey: keys.recipe(storeId, productId),
      enabled: Boolean(storeId),
      staleTime: 60_000,
      queryFn: async () => {
        try {
          return await recipesApi.get(storeId, productId)
        } catch (error) {
          if (isApiError(error) && error.code === "RECIPE_NOT_FOUND") return null
          throw error
        }
      },
    })),
  })
  const presence = new Map<string, boolean>()
  productIds.forEach((productId, index) => {
    const result = results[index]
    if (result.data !== undefined) presence.set(productId, result.data !== null)
  })
  return presence
}

export function useUpsertRecipe(productId: string) {
  const storeId = useActiveStoreId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: RecipeInput) => recipesApi.upsert(storeId, productId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.recipe(storeId, productId) })
      queryClient.invalidateQueries({ queryKey: keys.ingredients(storeId) })
      toast.success("Ficha técnica salva.")
    },
    onError: (error) => toast.error(errorMessage(error, "Não foi possível salvar a ficha técnica.")),
  })
}

export function useDeleteRecipe(productId: string) {
  const storeId = useActiveStoreId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => recipesApi.remove(storeId, productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.recipe(storeId, productId) })
      toast.success("Ficha técnica removida.")
    },
    onError: (error) => toast.error(errorMessage(error, "Não foi possível remover a ficha técnica.")),
  })
}
