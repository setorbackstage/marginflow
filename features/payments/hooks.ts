"use client"

import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import { toast } from "sonner"
import { useActiveStoreId } from "@/features/auth"
import { paymentsApi } from "./api"
import type { PaymentListParams, RefundPaymentInput } from "./types"

const keys = {
  list: (storeId: string, params: PaymentListParams) => ["payments", storeId, params] as const,
  detail: (storeId: string, paymentId: string) => ["payments", storeId, "detail", paymentId] as const,
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

export function usePayments(params: PaymentListParams) {
  const storeId = useActiveStoreId()
  return useQuery({
    queryKey: keys.list(storeId, params),
    enabled: Boolean(storeId),
    queryFn: () => paymentsApi.list(storeId, params),
    placeholderData: keepPreviousData,
  })
}

export function usePayment(paymentId: string | undefined) {
  const storeId = useActiveStoreId()
  return useQuery({
    queryKey: keys.detail(storeId, paymentId ?? ""),
    enabled: Boolean(storeId) && Boolean(paymentId),
    queryFn: () => paymentsApi.get(storeId, paymentId as string),
  })
}

export function useConfirmPayment() {
  const storeId = useActiveStoreId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (paymentId: string) => paymentsApi.confirm(storeId, paymentId),
    onSuccess: (_data, paymentId) => {
      queryClient.invalidateQueries({ queryKey: ["payments", storeId] })
      queryClient.invalidateQueries({ queryKey: keys.detail(storeId, paymentId) })
      queryClient.invalidateQueries({ queryKey: ["orders", storeId] })
      queryClient.invalidateQueries({ queryKey: ["customers", storeId] })
      toast.success("Pagamento confirmado.")
    },
    onError: (error) => toast.error(errorMessage(error, "Não foi possível confirmar o pagamento.")),
  })
}

export function useRefundPayment(paymentId: string) {
  const storeId = useActiveStoreId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: RefundPaymentInput) => paymentsApi.refund(storeId, paymentId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments", storeId] })
      queryClient.invalidateQueries({ queryKey: keys.detail(storeId, paymentId) })
      queryClient.invalidateQueries({ queryKey: ["orders", storeId] })
      toast.success("Reembolso processado.")
    },
    onError: (error) => toast.error(errorMessage(error, "Não foi possível processar o reembolso.")),
  })
}
