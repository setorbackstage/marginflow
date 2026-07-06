"use client"

import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import { toast } from "sonner"
import { isApiError } from "@/lib/api"
import { useActiveStoreId } from "@/features/auth"
import { ingredientsApi, movementsApi, alertsApi, recipesApi } from "./api"
import type { IngredientInput, IngredientListParams, MovementInput, MovementListParams, RecipeInput } from "./types"

const keys = {
  ingredients: (storeId: string) => ["ingredients", storeId] as const,
  ingredientList: (storeId: string, params: IngredientListParams) => ["ingredients", storeId, "list", params] as const,
  ingredient: (storeId: string, ingredientId: string) => ["ingredients", storeId, "detail", ingredientId] as const,
  movements: (storeId: string) => ["stock-movements", storeId] as const,
  movementList: (storeId: string, params: MovementListParams) => ["stock-movements", storeId, params] as const,
  alerts: (storeId: string) => ["stock-alerts", storeId] as const,
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

export function useCreateMovement() {
  const storeId = useActiveStoreId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: MovementInput) => movementsApi.create(storeId, input),
    onSuccess: () => {
      invalidateStock(queryClient, storeId)
      toast.success("Movimentação registrada.")
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
