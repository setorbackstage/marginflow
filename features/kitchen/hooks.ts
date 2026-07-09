"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useActiveStoreId } from "@/features/auth"
import { kitchenApi } from "./api"

const keys = {
  list: (storeId: string) => ["kitchen", storeId, "tickets"] as const,
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

/** Polls every 8s — the kitchen display must reflect new/updated tickets without manual refresh. */
export function useKitchenTickets() {
  const storeId = useActiveStoreId()
  return useQuery({
    queryKey: keys.list(storeId),
    enabled: Boolean(storeId),
    queryFn: () => kitchenApi.list(storeId),
    refetchInterval: 8_000,
    refetchIntervalInBackground: false,
  })
}

export function useUpdateTicketStatus() {
  const storeId = useActiveStoreId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ ticketId, status }: { ticketId: string; status: string }) => kitchenApi.updateTicketStatus(storeId, ticketId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.list(storeId) })
      queryClient.invalidateQueries({ queryKey: ["orders", storeId] })
      queryClient.invalidateQueries({ queryKey: ["delivery", storeId] })
    },
    onError: (error) => toast.error(errorMessage(error, "Não foi possível atualizar o status do ticket.")),
  })
}

export function useUpdateKitchenItemStatus() {
  const storeId = useActiveStoreId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ itemId, status }: { itemId: string; status: string }) => kitchenApi.updateItemStatus(storeId, itemId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.list(storeId) }),
    onError: (error) => toast.error(errorMessage(error, "Não foi possível atualizar o item.")),
  })
}
