"use client"

import { useMutation, useQuery, useQueries, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import { toast } from "sonner"
import { useActiveStoreId } from "@/features/auth"
import { categoriesApi, productsApi, modifierGroupsApi, modifiersApi } from "./api"
import type {
  CategoryInput,
  ProductInput,
  ProductListItem,
  ProductListParams,
  ModifierGroupInput,
  ModifierInput,
} from "./types"

const keys = {
  categories: (storeId: string) => ["categories", storeId] as const,
  products: (storeId: string, params: ProductListParams) => ["products", storeId, params] as const,
  product: (storeId: string, productId: string) => ["products", storeId, "detail", productId] as const,
  modifierGroups: (storeId: string, productId: string) => ["modifier-groups", storeId, productId] as const,
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

// ─────────────────────────── Categories ───────────────────────────

export function useCategories(search?: string) {
  const storeId = useActiveStoreId()
  return useQuery({
    queryKey: [...keys.categories(storeId), search ?? ""],
    enabled: Boolean(storeId),
    queryFn: () => categoriesApi.list(storeId, search),
  })
}

export function useCreateCategory() {
  const storeId = useActiveStoreId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CategoryInput) => categoriesApi.create(storeId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.categories(storeId) })
      toast.success("Categoria criada.")
    },
    onError: (error) => toast.error(errorMessage(error, "Não foi possível criar a categoria.")),
  })
}

export function useUpdateCategory() {
  const storeId = useActiveStoreId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ categoryId, input }: { categoryId: string; input: Partial<CategoryInput> }) =>
      categoriesApi.update(storeId, categoryId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.categories(storeId) })
      toast.success("Categoria atualizada.")
    },
    onError: (error) => toast.error(errorMessage(error, "Não foi possível atualizar a categoria.")),
  })
}

export function useDeleteCategory() {
  const storeId = useActiveStoreId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (categoryId: string) => categoriesApi.remove(storeId, categoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.categories(storeId) })
      toast.success("Categoria excluída.")
    },
    onError: (error) => toast.error(errorMessage(error, "Não foi possível excluir a categoria.")),
  })
}

// ─────────────────────────── Products ───────────────────────────

export function useProducts(params: ProductListParams) {
  const storeId = useActiveStoreId()
  return useQuery({
    queryKey: keys.products(storeId, params),
    enabled: Boolean(storeId),
    queryFn: () => productsApi.list(storeId, params),
    placeholderData: keepPreviousData,
  })
}

/**
 * Bulk "active products in this category" lookup for a bounded set of
 * category ids — used by the menu preview (one menu's visible sections,
 * never the whole catalog). Reuses `useProducts`'s query key shape so the
 * Products page cache is shared where params line up.
 */
export function useProductsByCategoryIds(categoryIds: string[]) {
  const storeId = useActiveStoreId()
  const params = { status: "ACTIVE" as const }
  const results = useQueries({
    queries: categoryIds.map((categoryId) => ({
      queryKey: keys.products(storeId, { ...params, categoryId }),
      enabled: Boolean(storeId),
      staleTime: 30_000,
      queryFn: () => productsApi.list(storeId, { ...params, categoryId }),
    })),
  })
  const byCategory = new Map<string, ProductListItem[]>()
  categoryIds.forEach((categoryId, index) => {
    const data = results[index].data
    if (data) byCategory.set(categoryId, data.items)
  })
  return { byCategory, isLoading: results.some((r) => r.isLoading) }
}

export function useProduct(productId: string | undefined) {
  const storeId = useActiveStoreId()
  return useQuery({
    queryKey: keys.product(storeId, productId ?? ""),
    enabled: Boolean(storeId) && Boolean(productId),
    queryFn: () => productsApi.get(storeId, productId as string),
  })
}

function invalidateProducts(queryClient: ReturnType<typeof useQueryClient>, storeId: string) {
  queryClient.invalidateQueries({ queryKey: ["products", storeId] })
  queryClient.invalidateQueries({ queryKey: keys.categories(storeId) })
}

export function useCreateProduct() {
  const storeId = useActiveStoreId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ProductInput) => productsApi.create(storeId, input),
    onSuccess: () => {
      invalidateProducts(queryClient, storeId)
      toast.success("Produto criado.")
    },
    onError: (error) => toast.error(errorMessage(error, "Não foi possível criar o produto.")),
  })
}

export function useUpdateProduct() {
  const storeId = useActiveStoreId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ productId, input }: { productId: string; input: Partial<ProductInput> }) =>
      productsApi.update(storeId, productId, input),
    onSuccess: (_data, variables) => {
      invalidateProducts(queryClient, storeId)
      queryClient.invalidateQueries({ queryKey: keys.product(storeId, variables.productId) })
      toast.success("Produto atualizado.")
    },
    onError: (error) => toast.error(errorMessage(error, "Não foi possível atualizar o produto.")),
  })
}

export function useDeleteProduct() {
  const storeId = useActiveStoreId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (productId: string) => productsApi.remove(storeId, productId),
    onSuccess: () => {
      invalidateProducts(queryClient, storeId)
      toast.success("Produto excluído.")
    },
    onError: (error) => toast.error(errorMessage(error, "Não foi possível excluir o produto.")),
  })
}

// ───────────────────────── Modifier Groups ─────────────────────────

export function useModifierGroups(productId: string | undefined) {
  const storeId = useActiveStoreId()
  return useQuery({
    queryKey: keys.modifierGroups(storeId, productId ?? ""),
    enabled: Boolean(storeId) && Boolean(productId),
    queryFn: () => modifierGroupsApi.list(storeId, productId as string),
  })
}

function invalidateGroups(queryClient: ReturnType<typeof useQueryClient>, storeId: string, productId: string) {
  queryClient.invalidateQueries({ queryKey: keys.modifierGroups(storeId, productId) })
  queryClient.invalidateQueries({ queryKey: keys.product(storeId, productId) })
}

export function useCreateModifierGroup(productId: string) {
  const storeId = useActiveStoreId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ModifierGroupInput) => modifierGroupsApi.create(storeId, productId, input),
    onSuccess: () => {
      invalidateGroups(queryClient, storeId, productId)
      toast.success("Grupo de modificadores criado.")
    },
    onError: (error) => toast.error(errorMessage(error, "Não foi possível criar o grupo.")),
  })
}

export function useUpdateModifierGroup(productId: string) {
  const storeId = useActiveStoreId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ groupId, input }: { groupId: string; input: Partial<ModifierGroupInput> }) =>
      modifierGroupsApi.update(storeId, productId, groupId, input),
    onSuccess: () => {
      invalidateGroups(queryClient, storeId, productId)
      toast.success("Grupo atualizado.")
    },
    onError: (error) => toast.error(errorMessage(error, "Não foi possível atualizar o grupo.")),
  })
}

export function useDeleteModifierGroup(productId: string) {
  const storeId = useActiveStoreId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (groupId: string) => modifierGroupsApi.remove(storeId, productId, groupId),
    onSuccess: () => {
      invalidateGroups(queryClient, storeId, productId)
      toast.success("Grupo excluído.")
    },
    onError: (error) => toast.error(errorMessage(error, "Não foi possível excluir o grupo.")),
  })
}

// ─────────────────────────── Modifiers ───────────────────────────

export function useCreateModifier(productId: string) {
  const storeId = useActiveStoreId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ groupId, input }: { groupId: string; input: ModifierInput }) =>
      modifiersApi.create(storeId, productId, groupId, input),
    onSuccess: () => {
      invalidateGroups(queryClient, storeId, productId)
      toast.success("Modificador criado.")
    },
    onError: (error) => toast.error(errorMessage(error, "Não foi possível criar o modificador.")),
  })
}

export function useUpdateModifier(productId: string) {
  const storeId = useActiveStoreId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ groupId, modifierId, input }: { groupId: string; modifierId: string; input: Partial<ModifierInput> }) =>
      modifiersApi.update(storeId, productId, groupId, modifierId, input),
    onSuccess: () => {
      invalidateGroups(queryClient, storeId, productId)
      toast.success("Modificador atualizado.")
    },
    onError: (error) => toast.error(errorMessage(error, "Não foi possível atualizar o modificador.")),
  })
}

export function useDeleteModifier(productId: string) {
  const storeId = useActiveStoreId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ groupId, modifierId }: { groupId: string; modifierId: string }) =>
      modifiersApi.remove(storeId, productId, groupId, modifierId),
    onSuccess: () => {
      invalidateGroups(queryClient, storeId, productId)
      toast.success("Modificador excluído.")
    },
    onError: (error) => toast.error(errorMessage(error, "Não foi possível excluir o modificador.")),
  })
}
