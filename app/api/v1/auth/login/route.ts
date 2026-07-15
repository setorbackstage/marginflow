import "server-only"
import type { NextRequest } from "next/server"
import { prisma } from "@/server/db"
import { loginService } from "@/server/services"
import { loginSchema, parseJsonBody } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok, setRefreshTokenCookie } from "@/server/lib/http"
import { rateLimit, getClientIp } from "@/server/lib/rate-limit"
import { toLoginResponse } from "../_auth-response"

async function handleLogin(request: NextRequest): Promise<Response> {
  const ip = getClientIp(request)
  const result = rateLimit(`login:${ip}`, 10, 60_000)
  if (!result.allowed) {
    return new Response(
      JSON.stringify({ error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many requests. Please try again later.", status: 429 } }),
      { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)) } },
    )
  }
  const input = await parseJsonBody(request, loginSchema)
  const result = await loginService.login(prisma, input)

  const response = ok(toLoginResponse(result))
  setRefreshTokenCookie(response, result.refreshToken)
  return response
}

export const POST = compose(withRequestContext, withErrorHandling)(handleLogin)
