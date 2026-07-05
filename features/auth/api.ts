import { api, setAccessToken, clearAccessToken } from "@/lib/api"
import type { LoginInput, SignupInput, Session } from "./types"

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
