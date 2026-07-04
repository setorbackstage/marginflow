import "server-only"
import type { NextResponse } from "next/server"
import { env } from "@/config/env"
import { REFRESH_TOKEN_COOKIE_NAME, REFRESH_TOKEN_TTL_SECONDS } from "../auth"

/**
 * Sets the `mf_refresh_token` cookie per API_SPEC.md's JWT Strategy:
 * HTTP-only, Secure, SameSite=Strict, 7-day expiry. `secure` is relaxed
 * outside production so the cookie is still sent over local http:// during
 * development. Shared by every endpoint that issues or rotates the token
 * (login, refresh).
 */
export function setRefreshTokenCookie(response: NextResponse, rawRefreshToken: string): void {
  response.cookies.set(REFRESH_TOKEN_COOKIE_NAME, rawRefreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: REFRESH_TOKEN_TTL_SECONDS,
  })
}
