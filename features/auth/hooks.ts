"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { login, logout, fetchMe } from "./api"
import { SESSION_KEY } from "./session"
import type { LoginInput } from "./types"

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
