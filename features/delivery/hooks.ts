"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useActiveStoreId } from "@/features/auth"
import { deliveryApi } from "./api"
import type { AssignCourierInput } from "./types"

const keys = {
  list: (storeId: string) => ["delivery", storeId, "list"] as const,
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

/** Polls every 10s so dispatch/status changes made by other operators show up live. */
export function useDeliveries() {
  const storeId = useActiveStoreId()
  return useQuery({
    queryKey: keys.list(storeId),
    enabled: Boolean(storeId),
    queryFn: () => deliveryApi.list(storeId),
    refetchInterval: 10_000,
  })
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>, storeId: string) {
  queryClient.invalidateQueries({ queryKey: keys.list(storeId) })
  queryClient.invalidateQueries({ queryKey: ["orders", storeId] })
}

export function useAssignCourier() {
  const storeId = useActiveStoreId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ deliveryId, input }: { deliveryId: string; input: AssignCourierInput }) => deliveryApi.assignCourier(storeId, deliveryId, input),
    onSuccess: () => {
      invalidate(queryClient, storeId)
      toast.success("Entregador atribuído.")
    },
    onError: (error) => toast.error(errorMessage(error, "Não foi possível atribuir o entregador.")),
  })
}

const DELIVERY_STATUS_TOAST: Record<string, string> = {
  DISPATCHED: "Entrega despachada.",
  IN_TRANSIT: "Entrega iniciada.",
  DELIVERED: "Entrega concluída.",
  FAILED: "Entrega marcada como falha.",
}

export function useUpdateDeliveryStatus() {
  const storeId = useActiveStoreId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ deliveryId, status, reason }: { deliveryId: string; status: string; reason?: string }) =>
      deliveryApi.updateStatus(storeId, deliveryId, status, reason),
    onSuccess: (_data, variables) => {
      invalidate(queryClient, storeId)
      toast.success(DELIVERY_STATUS_TOAST[variables.status] ?? "Status da entrega atualizado.")
    },
    onError: (error) => toast.error(errorMessage(error, "Não foi possível atualizar o status da entrega.")),
  })
}
