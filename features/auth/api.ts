import { api, setAccessToken, clearAccessToken } from "@/lib/api"
import type { LoginInput, SignupInput, Session } from "./types"

export interface SetApprovalPasswordInput {
  currentPassword: string
  newApprovalPassword: string
}

interface LoginResponse {
  accessToken: string
}

/** `POST /auth/login` — stores the returned access token in memory. */
export async function login(input: LoginInput): Promise<void> {
  const res = await api.post<LoginResponse>("/auth/login", input)
  setAccessToken(res.accessToken)
}

/** `POST /auth/signup` — creates the Account/Store/Owner in one shot and logs the new owner in immediately. */
export async function signup(input: SignupInput): Promise<void> {
  const res = await api.post<LoginResponse>("/auth/signup", input)
  setAccessToken(res.accessToken)
}

/** `GET /auth/me` — the canonical session (user + memberships + permissions). */
export function fetchMe(signal?: AbortSignal): Promise<Session> {
  return api.get<Session>("/auth/me", signal)
}

/** `POST /auth/logout` — best-effort server revoke; always clears the local token. */
export async function logout(): Promise<void> {
  try {
    await api.post("/auth/logout")
  } finally {
    clearAccessToken()
  }
}

/** `PATCH /auth/approval-password` — sets/replaces the caller's Business Rule 46 manager-override password. */
export function setApprovalPassword(input: SetApprovalPasswordInput): Promise<void> {
  return api.patch("/auth/approval-password", input)
}

/** `POST /auth/forgot-password` — requests a password reset email. Always succeeds to avoid user enumeration. */
export function forgotPassword(email: string): Promise<void> {
  return api.post("/auth/forgot-password", { email })
}

/** `POST /auth/reset-password` — resets the user's password using a token received by email. */
export function resetPassword(token: string, password: string): Promise<void> {
  return api.post("/auth/reset-password", { token, password })
}

/** `POST /auth/accept-invitation` — sets the user's password and activates their membership via an invitation token. */
export function acceptInvitation(token: string, password: string): Promise<void> {
  return api.post("/auth/accept-invitation", { token, password })
}

/** `PATCH /auth/me` — updates the caller's display name and/or phone number. */
export function updateProfile(patch: { name?: string; phone?: string | null }): Promise<Session> {
  return api.patch<Session>("/auth/me", patch)
}

/** `POST /auth/me/change-password` — changes the caller's login password. */
export function changePassword(input: { currentPassword: string; newPassword: string; confirmPassword: string }): Promise<void> {
  return api.post("/auth/me/change-password", input)
}
