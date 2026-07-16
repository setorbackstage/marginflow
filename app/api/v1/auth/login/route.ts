import "server-only"
import type { NextRequest } from "next/server"
import { prisma } from "@/server/db"
import { loginService } from "@/server/services"
import { loginSchema, parseJsonBody, logAudit } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok, setRefreshTokenCookie } from "@/server/lib/http"
import { rateLimit, getClientIp } from "@/server/lib/rate-limit"
import { toLoginResponse } from "../_auth-response"

const RATE_LIMIT_IP_MAX    = 10   // 10 tentativas por IP por minuto
const RATE_LIMIT_EMAIL_MAX = 5    // 5 tentativas por e-mail a cada 15 min (anti-stuffing)
const WINDOW_IP_MS         = 60_000
const WINDOW_EMAIL_MS      = 15 * 60_000

function rateLimitResponse(resetAt: number): Response {
  return new Response(
    JSON.stringify({
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests. Please try again later.",
        status: 429,
      },
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)),
      },
    },
  )
}

async function handleLogin(request: NextRequest): Promise<Response> {
  // 1. Rate limit por IP (rápido, antes de ler o body)
  const ip   = getClientIp(request)
  const ipRl = rateLimit(`login:ip:${ip}`, RATE_LIMIT_IP_MAX, WINDOW_IP_MS)
  if (!ipRl.allowed) return rateLimitResponse(ipRl.resetAt)

  // 2. Parseia o body para obter o e-mail
  const input = await parseJsonBody(request, loginSchema)

  // 3. Rate limit por e-mail (credential stuffing distribuído burla o limite por IP)
  const emailRl = rateLimit(`login:email:${input.email.toLowerCase()}`, RATE_LIMIT_EMAIL_MAX, WINDOW_EMAIL_MS)
  if (!emailRl.allowed) return rateLimitResponse(emailRl.resetAt)

  // 4. Autenticação
  const result = await loginService.login(prisma, input)

  void logAudit(prisma, {
    storeId: result.memberships[0]?.membership.storeId ?? "system",
    userId: result.user.id,
    action: "user.login",
    entityType: "User",
    entityId: result.user.id,
    entityRef: result.user.email,
  })

  const response = ok(toLoginResponse(result))
  setRefreshTokenCookie(response, result.refreshToken)
  return response
}

export const POST = compose(withRequestContext, withErrorHandling)(handleLogin)
