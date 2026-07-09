"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useActiveStoreId } from "@/features/auth"
import { integrationsApi } from "./api"

const keys = {
  list: (storeId: string) => ["integrations", storeId] as const,
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

export function useIntegrations() {
  const storeId = useActiveStoreId()
  return useQuery({
    queryKey: keys.list(storeId),
    enabled: Boolean(storeId),
    queryFn: () => integrationsApi.list(storeId),
  })
}

export function useConnectIntegration() {
  const storeId = useActiveStoreId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ platform, merchantId }: { platform: string; merchantId: string }) =>
      integrationsApi.connect(storeId, platform, merchantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.list(storeId) })
      toast.success("Integração conectada com sucesso.")
    },
    onError: (error) => toast.error(errorMessage(error, "Não foi possível conectar a integração.")),
  })
}

export function useDisconnectIntegration() {
  const storeId = useActiveStoreId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (platform: string) => integrationsApi.disconnect(storeId, platform),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.list(storeId) })
      toast.success("Integração desconectada.")
    },
    onError: (error) => toast.error(errorMessage(error, "Não foi possível desconectar a integração.")),
  })
}

export function useSetIntegrationPaused() {
  const storeId = useActiveStoreId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ platform, paused }: { platform: string; paused: boolean }) =>
      integrationsApi.setPaused(storeId, platform, paused),
    onSuccess: (_, { paused }) => {
      queryClient.invalidateQueries({ queryKey: keys.list(storeId) })
      toast.success(paused ? "Loja pausada no iFood." : "Loja reaberta no iFood.")
    },
    onError: (error) => toast.error(errorMessage(error, "Não foi possível alterar o status da loja no iFood.")),
  })
}

export function useSyncIntegrationNow() {
  const storeId = useActiveStoreId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (platform: string) => integrationsApi.syncNow(storeId, platform),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: keys.list(storeId) })
      toast.success(
        data.eventsProcessed > 0
          ? `${data.eventsProcessed} evento(s) iFood processado(s).`
          : "Nenhum evento pendente no iFood.",
      )
    },
    onError: (error) => toast.error(errorMessage(error, "Não foi possível sincronizar com o iFood.")),
  })
}
