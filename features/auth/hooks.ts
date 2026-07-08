"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { login, signup, logout, fetchMe, setApprovalPassword, forgotPassword, resetPassword, acceptInvitation } from "./api"
import { SESSION_KEY } from "./session"
import type { LoginInput, SignupInput } from "./types"
import type { SetApprovalPasswordInput } from "./api"

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

/**
 * Login mutation. On success it warms the session cache (so the app shell has
 * data the instant it mounts) and navigates into the app.
 */
export function useLogin() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: (input: LoginInput) => login(input),
    onSuccess: async () => {
      await queryClient.fetchQuery({ queryKey: SESSION_KEY, queryFn: ({ signal }) => fetchMe(signal) })
      router.replace("/")
    },
  })
}

/** Signup mutation — same post-success flow as login (the new owner is already authenticated). */
export function useSignup() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: (input: SignupInput) => signup(input),
    onSuccess: async () => {
      await queryClient.fetchQuery({ queryKey: SESSION_KEY, queryFn: ({ signal }) => fetchMe(signal) })
      router.replace("/")
    },
  })
}

/** Logout mutation — revokes server-side, clears all cached data, returns to login. */
export function useLogout() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: () => logout(),
    onSuccess: () => {
      queryClient.clear()
      router.replace("/login")
    },
  })
}

/** Sets/replaces the caller's own Business Rule 46 "approval password" — see `PATCH /auth/approval-password`. */
export function useSetApprovalPassword() {
  return useMutation({
    mutationFn: (input: SetApprovalPasswordInput) => setApprovalPassword(input),
    onSuccess: () => toast.success("Senha de aprovação definida."),
    onError: (error) => toast.error(errorMessage(error, "Não foi possível definir a senha de aprovação.")),
  })
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: ({ email }: { email: string }) => forgotPassword(email),
  })
}

export function useResetPassword() {
  const router = useRouter()
  return useMutation({
    mutationFn: ({ token, password }: { token: string; password: string }) => resetPassword(token, password),
    onSuccess: () => {
      toast.success("Senha redefinida! Faça login.")
      router.replace("/login")
    },
  })
}

export function useAcceptInvitation() {
  const router = useRouter()
  return useMutation({
    mutationFn: ({ token, password }: { token: string; password: string }) => acceptInvitation(token, password),
    onSuccess: () => {
      toast.success("Conta ativada! Faça login.")
      router.replace("/login")
    },
  })
}
