import "server-only"
import type { NextRequest } from "next/server"
import { prisma } from "@/server/db"
import { refreshTokenService } from "@/server/services"
import { REFRESH_TOKEN_COOKIE_NAME, UnauthorizedError } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok, setRefreshTokenCookie } from "@/server/lib/http"
import { rateLimit, getClientIp } from "@/server/lib/rate-limit"

async function handleRefresh(request: NextRequest): Promise<Response> {
  const ip = getClientIp(request)
  const rl = rateLimit(`refresh:${ip}`, 30, 60_000)
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({ error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many requests. Please try again later.", status: 429 } }),
      { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
    )
  }
  const rawToken = request.cookies.get(REFRESH_TOKEN_COOKIE_NAME)?.value
  if (!rawToken) {
    throw new UnauthorizedError("REFRESH_TOKEN_MISSING", "No refresh token cookie present.")
  }

  const result = await refreshTokenService.refresh(prisma, rawToken)

  const response = ok({ accessToken: result.accessToken })
  setRefreshTokenCookie(response, result.refreshToken)
  return response
}

export const POST = compose(withRequestContext, withErrorHandling)(handleRefresh)
