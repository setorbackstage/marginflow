"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useActiveStoreId } from "@/features/auth"
import { storesApi } from "./api"
import type { UpdateStoreInput, UpdateStoreSettingsInput } from "./types"

const keys = {
  store: (storeId: string) => ["stores", storeId] as const,
  settings: (storeId: string) => ["stores", storeId, "settings"] as const,
  roles: (storeId: string) => ["stores", storeId, "roles"] as const,
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

export function useStore() {
  const storeId = useActiveStoreId()
  return useQuery({ queryKey: keys.store(storeId), enabled: Boolean(storeId), queryFn: () => storesApi.get(storeId) })
}

export function useStoreSettings() {
  const storeId = useActiveStoreId()
  return useQuery({ queryKey: keys.settings(storeId), enabled: Boolean(storeId), queryFn: () => storesApi.getSettings(storeId) })
}

export function useRoles() {
  const storeId = useActiveStoreId()
  return useQuery({ queryKey: keys.roles(storeId), enabled: Boolean(storeId), queryFn: () => storesApi.listRoles(storeId) })
}

export function useUpdateStore() {
  const storeId = useActiveStoreId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateStoreInput) => storesApi.update(storeId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.store(storeId) })
      toast.success("Dados da loja atualizados.")
    },
    onError: (error) => toast.error(errorMessage(error, "Não foi possível atualizar a loja.")),
  })
}

export function useUpdateStoreSettings() {
  const storeId = useActiveStoreId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateStoreSettingsInput) => storesApi.updateSettings(storeId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.settings(storeId) })
      toast.success("Configurações atualizadas.")
    },
    onError: (error) => toast.error(errorMessage(error, "Não foi possível atualizar as configurações.")),
  })
}
