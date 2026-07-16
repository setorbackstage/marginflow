"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useActiveStoreId } from "@/features/auth"
import { useStore, useStoreSettings, storesApi } from "@/features/stores"
import { categoriesApi, productsApi } from "@/features/products"
import { ingredientsApi } from "@/features/inventory"
import { customersApi } from "@/features/customers"
import { ordersApi } from "@/features/orders"
import type { ChecklistItem, OnboardingSettings } from "./types"

// ---------------------------------------------------------------------------
// useOnboardingSettings
// ---------------------------------------------------------------------------

export function useOnboardingSettings(): { settings: OnboardingSettings; isLoading: boolean } {
  const { data, isLoading } = useStoreSettings()
  const raw = data?.notificationPreferences?.onboarding
  const settings = (typeof raw === "object" && raw !== null ? raw : {}) as OnboardingSettings
  return { settings, isLoading }
}

// ---------------------------------------------------------------------------
// useDismissWelcome — uses raw API to avoid the toast from useUpdateStoreSettings
// ---------------------------------------------------------------------------

export function useDismissWelcome(): () => void {
  const storeId = useActiveStoreId()
  const queryClient = useQueryClient()
  const { data: settingsData } = useStoreSettings()

  const mutation = useMutation({
    mutationFn: () => {
      const currentPrefs =
        typeof settingsData?.notificationPreferences === "object" && settingsData.notificationPreferences !== null
          ? settingsData.notificationPreferences
          : {}
      const currentOnboarding =
        typeof currentPrefs["onboarding"] === "object" && currentPrefs["onboarding"] !== null
          ? (currentPrefs["onboarding"] as Record<string, unknown>)
          : {}
      return storesApi.updateSettings(storeId, {
        notificationPreferences: {
          ...currentPrefs,
          onboarding: { ...currentOnboarding, welcomeDismissed: true },
        },
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["stores", storeId, "settings"] })
    },
  })

  return () => mutation.mutate()
}

// ---------------------------------------------------------------------------
// useCompleteOnboarding
// ---------------------------------------------------------------------------

export function useCompleteOnboarding(): () => void {
  const storeId = useActiveStoreId()
  const queryClient = useQueryClient()
  const { data: settingsData } = useStoreSettings()

  const mutation = useMutation({
    mutationFn: () => {
      const currentPrefs =
        typeof settingsData?.notificationPreferences === "object" && settingsData.notificationPreferences !== null
          ? settingsData.notificationPreferences
          : {}
      const currentOnboarding =
        typeof currentPrefs["onboarding"] === "object" && currentPrefs["onboarding"] !== null
          ? (currentPrefs["onboarding"] as Record<string, unknown>)
          : {}
      return storesApi.updateSettings(storeId, {
        notificationPreferences: {
          ...currentPrefs,
          onboarding: { ...currentOnboarding, completedAt: new Date().toISOString() },
        },
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["stores", storeId, "settings"] })
    },
  })

  return () => mutation.mutate()
}

// ---------------------------------------------------------------------------
// useMarkRecipeCreated
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// useSetTourPending — ativa/desativa o tour do dashboard
// ---------------------------------------------------------------------------

export function useSetTourPending(): (pending: boolean) => void {
  const storeId = useActiveStoreId()
  const queryClient = useQueryClient()
  const { data: settingsData } = useStoreSettings()

  const mutation = useMutation({
    mutationFn: (pending: boolean) => {
      const currentPrefs =
        typeof settingsData?.notificationPreferences === "object" && settingsData.notificationPreferences !== null
          ? settingsData.notificationPreferences
          : {}
      const currentOnboarding =
        typeof currentPrefs["onboarding"] === "object" && currentPrefs["onboarding"] !== null
          ? (currentPrefs["onboarding"] as Record<string, unknown>)
          : {}
      return storesApi.updateSettings(storeId, {
        notificationPreferences: {
          ...currentPrefs,
          onboarding: { ...currentOnboarding, tourPending: pending },
        },
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["stores", storeId, "settings"] })
    },
  })

  return (pending: boolean) => mutation.mutate(pending)
}

export function useMarkRecipeCreated(): () => void {
  const storeId = useActiveStoreId()
  const queryClient = useQueryClient()
  const { data: settingsData } = useStoreSettings()

  const mutation = useMutation({
    mutationFn: () => {
      const currentPrefs =
        typeof settingsData?.notificationPreferences === "object" && settingsData.notificationPreferences !== null
          ? settingsData.notificationPreferences
          : {}
      const currentOnboarding =
        typeof currentPrefs["onboarding"] === "object" && currentPrefs["onboarding"] !== null
          ? (currentPrefs["onboarding"] as Record<string, unknown>)
          : {}
      return storesApi.updateSettings(storeId, {
        notificationPreferences: {
          ...currentPrefs,
          onboarding: { ...currentOnboarding, recipeCreated: true },
        },
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["stores", storeId, "settings"] })
    },
  })

  return () => mutation.mutate()
}

// ---------------------------------------------------------------------------
// useChecklist
// ---------------------------------------------------------------------------

export function useChecklist(): ChecklistItem[] {
  const storeId = useActiveStoreId()
  const enabled = Boolean(storeId)

  const store = useStore()
  const storeSettings = useStoreSettings()
  const { settings: onboarding } = useOnboardingSettings()

  const categoriesQuery = useQuery({
    queryKey: ["categories", storeId, "presence"],
    queryFn: () => categoriesApi.list(storeId),
    enabled,
    staleTime: 60_000,
  })

  const productsQuery = useQuery({
    queryKey: ["products", storeId, "presence"],
    queryFn: () => productsApi.list(storeId, { page: 1 }),
    enabled,
    staleTime: 60_000,
  })

  const ingredientsQuery = useQuery({
    queryKey: ["ingredients", storeId, "presence"],
    queryFn: () => ingredientsApi.list(storeId, { page: 1, perPage: 1 }),
    enabled,
    staleTime: 60_000,
  })

  const customersQuery = useQuery({
    queryKey: ["customers", storeId, "presence"],
    queryFn: () => customersApi.list(storeId, { page: 1 }),
    enabled,
    staleTime: 60_000,
  })

  const ordersQuery = useQuery({
    queryKey: ["orders", storeId, "presence"],
    queryFn: () => ordersApi.list(storeId, { page: 1 }),
    enabled,
    staleTime: 60_000,
  })

  const s = storeSettings.data

  const items: ChecklistItem[] = [
    {
      id: "store_created",
      label: "Criar loja",
      description: "Sua loja está pronta no MarginFlow.",
      href: "/",
      completed: true,
      isLoading: false,
    },
    {
      id: "logo_added",
      label: "Adicionar logo",
      description: "Personalize sua loja com um logotipo.",
      href: "/settings",
      completed: store.data?.logoUrl != null,
      isLoading: store.isLoading,
    },
    {
      id: "categories_created",
      label: "Cadastrar categorias",
      description: "Organize seus produtos em categorias.",
      href: "/products",
      completed: (categoriesQuery.data?.length ?? 0) > 0,
      isLoading: categoriesQuery.isLoading,
    },
    {
      id: "products_created",
      label: "Cadastrar produtos",
      description: "Adicione os itens do seu cardápio.",
      href: "/products",
      completed: (productsQuery.data?.pagination.total ?? 0) > 0,
      isLoading: productsQuery.isLoading,
    },
    {
      id: "ingredients_created",
      label: "Cadastrar insumos",
      description: "Gerencie seus ingredientes e matérias-primas.",
      href: "/inventory",
      completed: (ingredientsQuery.data?.pagination.total ?? 0) > 0,
      isLoading: ingredientsQuery.isLoading,
    },
    {
      id: "recipe_created",
      label: "Criar ficha técnica",
      description: "Calcule o custo real de cada produto.",
      href: "/inventory",
      completed: onboarding.recipeCreated === true,
      isLoading: storeSettings.isLoading,
    },
    {
      id: "customer_created",
      label: "Cadastrar cliente",
      description: "Comece a construir sua base de clientes.",
      href: "/customers",
      completed: (customersQuery.data?.pagination.total ?? 0) > 0,
      isLoading: customersQuery.isLoading,
    },
    {
      id: "order_created",
      label: "Criar primeiro pedido",
      description: "Registre seu primeiro pedido e veja o sistema em ação.",
      href: "/orders",
      completed: (ordersQuery.data?.pagination.total ?? 0) > 0,
      isLoading: ordersQuery.isLoading,
    },
    {
      id: "payment_configured",
      label: "Configurar pagamento",
      description: "Defina as formas de pagamento aceitas.",
      href: "/settings",
      completed:
        (s?.acceptsCash || s?.acceptsCard || s?.acceptsPix || s?.acceptsVoucher || s?.acceptsOnlinePayment) ?? false,
      isLoading: storeSettings.isLoading,
    },
    {
      id: "onboarding_complete",
      label: "Concluir onboarding",
      description: "Finalize o processo de configuração.",
      href: "/",
      completed: onboarding.completedAt != null,
      isLoading: storeSettings.isLoading,
    },
  ]

  return items
}
