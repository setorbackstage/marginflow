"use client"

import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import { toast } from "sonner"
import { useActiveStoreId } from "@/features/auth"
import { customersApi, addressesApi } from "./api"
import type { AddressInput, CreateCustomerInput, CustomerListParams, UpdateCustomerInput } from "./types"

const keys = {
  list: (storeId: string, params: CustomerListParams) => ["customers", storeId, params] as const,
  detail: (storeId: string, customerId: string) => ["customers", storeId, "detail", customerId] as const,
  addresses: (storeId: string, customerId: string) => ["customers", storeId, "addresses", customerId] as const,
  orders: (storeId: string, customerId: string) => ["customers", storeId, "orders", customerId] as const,
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

export function useCustomers(params: CustomerListParams) {
  const storeId = useActiveStoreId()
  return useQuery({
    queryKey: keys.list(storeId, params),
    enabled: Boolean(storeId),
    queryFn: () => customersApi.list(storeId, params),
    placeholderData: keepPreviousData,
  })
}

export function useCustomer(customerId: string | undefined) {
  const storeId = useActiveStoreId()
  return useQuery({
    queryKey: keys.detail(storeId, customerId ?? ""),
    enabled: Boolean(storeId) && Boolean(customerId),
    queryFn: () => customersApi.get(storeId, customerId as string),
  })
}

export function useCustomerOrders(customerId: string | undefined) {
  const storeId = useActiveStoreId()
  return useQuery({
    queryKey: keys.orders(storeId, customerId ?? ""),
    enabled: Boolean(storeId) && Boolean(customerId),
    queryFn: () => customersApi.listOrders(storeId, customerId as string),
  })
}

export function useCreateCustomer() {
  const storeId = useActiveStoreId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateCustomerInput) => customersApi.create(storeId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers", storeId] })
      toast.success("Cliente criado.")
    },
    onError: (error) => toast.error(errorMessage(error, "Não foi possível criar o cliente.")),
  })
}

export function useUpdateCustomer() {
  const storeId = useActiveStoreId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ customerId, input }: { customerId: string; input: UpdateCustomerInput }) =>
      customersApi.update(storeId, customerId, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["customers", storeId] })
      queryClient.invalidateQueries({ queryKey: keys.detail(storeId, variables.customerId) })
      toast.success("Cliente atualizado.")
    },
    onError: (error) => toast.error(errorMessage(error, "Não foi possível atualizar o cliente.")),
  })
}

export function useBlockCustomer() {
  const storeId = useActiveStoreId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ customerId, status }: { customerId: string; status: "ACTIVE" | "BLOCKED" }) =>
      customersApi.update(storeId, customerId, { status }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["customers", storeId] })
      queryClient.invalidateQueries({ queryKey: keys.detail(storeId, variables.customerId) })
      toast.success(variables.status === "BLOCKED" ? "Cliente bloqueado." : "Cliente desbloqueado.")
    },
    onError: (error) => toast.error(errorMessage(error, "Não foi possível alterar o status do cliente.")),
  })
}

export function useAddresses(customerId: string | undefined) {
  const storeId = useActiveStoreId()
  return useQuery({
    queryKey: keys.addresses(storeId, customerId ?? ""),
    enabled: Boolean(storeId) && Boolean(customerId),
    queryFn: () => addressesApi.list(storeId, customerId as string),
  })
}

function invalidateAddresses(queryClient: ReturnType<typeof useQueryClient>, storeId: string, customerId: string) {
  queryClient.invalidateQueries({ queryKey: keys.addresses(storeId, customerId) })
  queryClient.invalidateQueries({ queryKey: keys.detail(storeId, customerId) })
}

export function useCreateAddress(customerId: string) {
  const storeId = useActiveStoreId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: AddressInput) => addressesApi.create(storeId, customerId, input),
    onSuccess: () => {
      invalidateAddresses(queryClient, storeId, customerId)
      toast.success("Endereço adicionado.")
    },
    onError: (error) => toast.error(errorMessage(error, "Não foi possível adicionar o endereço.")),
  })
}

export function useUpdateAddress(customerId: string) {
  const storeId = useActiveStoreId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ addressId, input }: { addressId: string; input: Partial<AddressInput> }) =>
      addressesApi.update(storeId, customerId, addressId, input),
    onSuccess: () => {
      invalidateAddresses(queryClient, storeId, customerId)
      toast.success("Endereço atualizado.")
    },
    onError: (error) => toast.error(errorMessage(error, "Não foi possível atualizar o endereço.")),
  })
}

export function useDeleteAddress(customerId: string) {
  const storeId = useActiveStoreId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (addressId: string) => addressesApi.remove(storeId, customerId, addressId),
    onSuccess: () => {
      invalidateAddresses(queryClient, storeId, customerId)
      toast.success("Endereço removido.")
    },
    onError: (error) => toast.error(errorMessage(error, "Não foi possível remover o endereço.")),
  })
}
