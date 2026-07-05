"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useActiveStoreId } from "@/features/auth"
import { menusApi } from "./api"
import type { CreateMenuInput, MenuSectionInput, UpdateMenuInput } from "./types"

const keys = {
  list: (storeId: string) => ["menus", storeId] as const,
  detail: (storeId: string, menuId: string) => ["menus", storeId, "detail", menuId] as const,
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

export function useMenus() {
  const storeId = useActiveStoreId()
  return useQuery({
    queryKey: keys.list(storeId),
    enabled: Boolean(storeId),
    queryFn: () => menusApi.list(storeId),
  })
}

export function useMenu(menuId: string | undefined) {
  const storeId = useActiveStoreId()
  return useQuery({
    queryKey: keys.detail(storeId, menuId ?? ""),
    enabled: Boolean(storeId) && Boolean(menuId),
    queryFn: () => menusApi.get(storeId, menuId as string),
  })
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>, storeId: string, menuId?: string) {
  queryClient.invalidateQueries({ queryKey: keys.list(storeId) })
  if (menuId) queryClient.invalidateQueries({ queryKey: keys.detail(storeId, menuId) })
}

export function useCreateMenu() {
  const storeId = useActiveStoreId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateMenuInput) => menusApi.create(storeId, input),
    onSuccess: () => {
      invalidate(queryClient, storeId)
      toast.success("Cardápio criado.")
    },
    onError: (error) => toast.error(errorMessage(error, "Não foi possível criar o cardápio.")),
  })
}

export function useUpdateMenu() {
  const storeId = useActiveStoreId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ menuId, input }: { menuId: string; input: UpdateMenuInput }) => menusApi.update(storeId, menuId, input),
    onSuccess: (_data, variables) => {
      invalidate(queryClient, storeId, variables.menuId)
      toast.success("Cardápio atualizado.")
    },
    onError: (error) => toast.error(errorMessage(error, "Não foi possível atualizar o cardápio.")),
  })
}

export function useDeleteMenu() {
  const storeId = useActiveStoreId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (menuId: string) => menusApi.remove(storeId, menuId),
    onSuccess: () => {
      invalidate(queryClient, storeId)
      toast.success("Cardápio excluído.")
    },
    onError: (error) => toast.error(errorMessage(error, "Não foi possível excluir o cardápio.")),
  })
}

export function usePublishMenu() {
  const storeId = useActiveStoreId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (menuId: string) => menusApi.publish(storeId, menuId),
    onSuccess: (_data, menuId) => {
      invalidate(queryClient, storeId, menuId)
      toast.success("Cardápio publicado.")
    },
    onError: (error) => toast.error(errorMessage(error, "Não foi possível publicar o cardápio.")),
  })
}

export function useUnpublishMenu() {
  const storeId = useActiveStoreId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (menuId: string) => menusApi.unpublish(storeId, menuId),
    onSuccess: (_data, menuId) => {
      invalidate(queryClient, storeId, menuId)
      toast.success("Cardápio despublicado.")
    },
    onError: (error) => toast.error(errorMessage(error, "Não foi possível despublicar o cardápio.")),
  })
}

export function useReplaceSections(menuId: string) {
  const storeId = useActiveStoreId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (sections: MenuSectionInput[]) => menusApi.replaceSections(storeId, menuId, sections),
    onSuccess: () => {
      invalidate(queryClient, storeId, menuId)
      toast.success("Seções do cardápio atualizadas.")
    },
    onError: (error) => toast.error(errorMessage(error, "Não foi possível atualizar as seções.")),
  })
}
