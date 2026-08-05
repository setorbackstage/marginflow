import "server-only"
import type { NextRequest, NextResponse } from "next/server"
import { env } from "@/config/env"
import { REFRESH_TOKEN_COOKIE_NAME, REFRESH_TOKEN_TTL_SECONDS } from "../auth"

/**
 * Sets the `mf_refresh_token` cookie per API_SPEC.md's JWT Strategy:
 * HTTP-only, Secure, SameSite=Strict, 7-day expiry.
 *
 * SECURITY (VULN-006): `secure` is true whenever the request arrived over
 * HTTPS (Vercel production always does) or NODE_ENV is production. We key off
 * the real `x-forwarded-proto` header rather than only NODE_ENV, so a
 * misconfigured NODE_ENV in production cannot accidentally downgrade the
 * cookie to cleartext.
 */
export function setRefreshTokenCookie(
  response: NextResponse,
  rawRefreshToken: string,
  request?: NextRequest,
): void {
  const isHttps =
    env.NODE_ENV === "production" ||
    request?.headers.get("x-forwarded-proto") === "https"
  const secure = Boolean(isHttps)

  response.cookies.set(REFRESH_TOKEN_COOKIE_NAME, rawRefreshToken, {
    httpOnly: true,
    secure,
    sameSite: "strict",
    path: "/",
    maxAge: REFRESH_TOKEN_TTL_SECONDS,
  })
}
