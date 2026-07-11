"use client"

import { useMutation, useQuery, useQueries, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import { toast } from "sonner"
import { useActiveStoreId } from "@/features/auth"
import { ordersApi } from "./api"
import type { CreateOrderInput, OrderDetail, OrderListParams, UpdateOrderItemInput } from "./types"

const keys = {
  list: (storeId: string, params: OrderListParams) => ["orders", storeId, params] as const,
  detail: (storeId: string, orderId: string) => ["orders", storeId, "detail", orderId] as const,
  timeline: (storeId: string, orderId: string) => ["orders", storeId, "timeline", orderId] as const,
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

export function useOrders(params: OrderListParams) {
  const storeId = useActiveStoreId()
  return useQuery({
    queryKey: keys.list(storeId, params),
    enabled: Boolean(storeId),
    queryFn: () => ordersApi.list(storeId, params),
    placeholderData: keepPreviousData,
    // Realtime (Supabase postgres_changes) handles instant updates.
    // Polling at 15s is a safety net for connection drops.
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  })
}

export function useOrder(orderId: string | undefined) {
  const storeId = useActiveStoreId()
  return useQuery({
    queryKey: keys.detail(storeId, orderId ?? ""),
    enabled: Boolean(storeId) && Boolean(orderId),
    queryFn: () => ordersApi.get(storeId, orderId as string),
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
  })
}

/**
 * Bulk customer lookup for a bounded set of orders (e.g. the active
 * deliveries kanban — never the whole order history). There is no
 * customer name/phone on the Delivery response itself (API_SPEC.md), so
 * this reuses the exact `useOrder` query key/fetch, sharing its cache
 * instead of adding a new request shape.
 */
export function useOrdersByIds(orderIds: string[]) {
  const storeId = useActiveStoreId()
  const results = useQueries({
    queries: orderIds.map((orderId) => ({
      queryKey: keys.detail(storeId, orderId),
      enabled: Boolean(storeId),
      staleTime: 10_000,
      queryFn: () => ordersApi.get(storeId, orderId),
    })),
  })
  const byId = new Map<string, OrderDetail>()
  orderIds.forEach((orderId, index) => {
    const data = results[index].data
    if (data) byId.set(orderId, data)
  })
  return byId
}

export function useOrderTimeline(orderId: string | undefined) {
  const storeId = useActiveStoreId()
  return useQuery({
    queryKey: keys.timeline(storeId, orderId ?? ""),
    enabled: Boolean(storeId) && Boolean(orderId),
    queryFn: () => ordersApi.timeline(storeId, orderId as string),
  })
}

function invalidateOrder(queryClient: ReturnType<typeof useQueryClient>, storeId: string, orderId: string) {
  queryClient.invalidateQueries({ queryKey: ["orders", storeId] })
  queryClient.invalidateQueries({ queryKey: keys.timeline(storeId, orderId) })
}

export function useCreateOrder() {
  const storeId = useActiveStoreId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateOrderInput) => ordersApi.create(storeId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", storeId] })
      toast.success("Pedido criado.")
    },
    onError: (error) => toast.error(errorMessage(error, "Não foi possível criar o pedido.")),
  })
}

const ORDER_STATUS_TOAST: Record<string, string> = {
  PENDING: "Pedido enviado.",
  CONFIRMED: "Pedido confirmado.",
  CANCELLED: "Pedido cancelado.",
  DELIVERED: "Pedido entregue.",
}

export function useUpdateOrderStatus(orderId: string) {
  const storeId = useActiveStoreId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      status,
      reason,
      notes,
      managerEmail,
      managerApprovalPassword,
    }: {
      status: string
      reason?: string
      notes?: string
      managerEmail?: string
      managerApprovalPassword?: string
    }) =>
      ordersApi.updateStatus(
        storeId,
        orderId,
        status,
        reason,
        notes,
        managerEmail && managerApprovalPassword ? { managerEmail, managerApprovalPassword } : undefined,
      ),
    onSuccess: (_data, variables) => {
      invalidateOrder(queryClient, storeId, orderId)
      toast.success(ORDER_STATUS_TOAST[variables.status] ?? "Status do pedido atualizado.")
    },
    onError: (error) => toast.error(errorMessage(error, "Não foi possível atualizar o status.")),
  })
}

export function useAddOrderItem(orderId: string) {
  const storeId = useActiveStoreId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { productId: string; quantity: number; selectedModifiers?: { modifierId: string; modifierGroupId: string }[]; notes?: string | null }) =>
      ordersApi.addItem(storeId, orderId, input),
    onSuccess: () => {
      invalidateOrder(queryClient, storeId, orderId)
      toast.success("Item adicionado.")
    },
    onError: (error) => toast.error(errorMessage(error, "Não foi possível adicionar o item.")),
  })
}

export function useUpdateOrderItem(orderId: string) {
  const storeId = useActiveStoreId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ itemId, input }: { itemId: string; input: UpdateOrderItemInput }) => ordersApi.updateItem(storeId, orderId, itemId, input),
    onSuccess: () => invalidateOrder(queryClient, storeId, orderId),
    onError: (error) => toast.error(errorMessage(error, "Não foi possível atualizar o item.")),
  })
}

export function useRemoveOrderItem(orderId: string) {
  const storeId = useActiveStoreId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (itemId: string) => ordersApi.removeItem(storeId, orderId, itemId),
    onSuccess: () => {
      invalidateOrder(queryClient, storeId, orderId)
      toast.success("Item removido.")
    },
    onError: (error) => toast.error(errorMessage(error, "Não foi possível remover o item.")),
  })
}

export function useInitiatePayment(orderId: string) {
  const storeId = useActiveStoreId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { method: string; gateway?: string }) => ordersApi.initiatePayment(storeId, orderId, input),
    onSuccess: () => {
      invalidateOrder(queryClient, storeId, orderId)
      toast.success("Pagamento iniciado.")
    },
    onError: (error) => toast.error(errorMessage(error, "Não foi possível iniciar o pagamento.")),
  })
}
