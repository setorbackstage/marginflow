"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { isApiError } from "@/lib/api"
import { useActiveStoreId } from "@/features/auth"
import { teamApi } from "./api"
import type { InviteMemberInput, TeamListParams } from "./types"

const keys = {
  list: (storeId: string, params: TeamListParams) => ["team", storeId, params] as const,
  detail: (storeId: string, userId: string) => ["team", storeId, "detail", userId] as const,
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

export function useTeam(params: TeamListParams) {
  const storeId = useActiveStoreId()
  return useQuery({
    queryKey: keys.list(storeId, params),
    enabled: Boolean(storeId),
    queryFn: () => teamApi.list(storeId, params),
  })
}

export function useTeamMember(userId: string | undefined) {
  const storeId = useActiveStoreId()
  return useQuery({
    queryKey: keys.detail(storeId, userId ?? ""),
    enabled: Boolean(storeId) && Boolean(userId),
    queryFn: () => teamApi.get(storeId, userId as string),
  })
}

export function useInviteMember() {
  const storeId = useActiveStoreId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: InviteMemberInput) => teamApi.invite(storeId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team", storeId] })
      toast.success("Convite enviado.")
    },
    onError: (error) =>
      toast.error(
        isApiError(error) && error.code === "USER_ALREADY_MEMBER"
          ? "Este e-mail já é membro ativo da loja."
          : errorMessage(error, "Não foi possível enviar o convite."),
      ),
  })
}

export function useChangeMemberRole() {
  const storeId = useActiveStoreId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) => teamApi.changeRole(storeId, userId, roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team", storeId] })
      toast.success("Perfil atualizado.")
    },
    onError: (error) =>
      toast.error(
        isApiError(error) && error.code === "INSUFFICIENT_PERMISSIONS"
          ? "Somente o proprietário pode atribuir ou remover o perfil de Proprietário."
          : errorMessage(error, "Não foi possível atualizar o perfil."),
      ),
  })
}

export function useRevokeMember() {
  const storeId = useActiveStoreId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => teamApi.revoke(storeId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team", storeId] })
      toast.success("Acesso revogado.")
    },
    onError: (error) =>
      toast.error(
        isApiError(error) && error.code === "CANNOT_REMOVE_LAST_OWNER"
          ? "A loja precisa de ao menos um proprietário ativo."
          : errorMessage(error, "Não foi possível revogar o acesso."),
      ),
  })
}
