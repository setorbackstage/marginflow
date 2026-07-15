import "server-only"
import type { NextRequest } from "next/server"
import { prisma } from "@/server/db"
import { signupService } from "@/server/services"
import { signupSchema, parseJsonBody, hashPassword } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, created, setRefreshTokenCookie } from "@/server/lib/http"
import { rateLimit, getClientIp } from "@/server/lib/rate-limit"
import { toLoginResponse } from "../_auth-response"

/**
 * `POST /api/v1/auth/signup`. Public, self-service tenant creation — no
 * seed script, no direct DB access required to get a working account.
 * Hashing happens here (outside the transaction) since `scrypt` is slow and
 * has no DB side effect; everything that touches the database — Account,
 * Store, StoreSettings, the OWNER Role, the User, and the ACTIVE Membership
 * — is created atomically in `signupService.signup` via `prisma.$transaction`.
 */
async function handleSignup(request: NextRequest): Promise<Response> {
  const ip = getClientIp(request)
  const rl = rateLimit(`signup:${ip}`, 5, 60_000)
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({ error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many requests. Please try again later.", status: 429 } }),
      { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
    )
  }
  const input = await parseJsonBody(request, signupSchema)
  const passwordHash = await hashPassword(input.password)

  const result = await prisma.$transaction((tx) =>
    signupService.signup(tx, {
      storeName: input.storeName,
      ownerName: input.ownerName,
      email: input.email,
      passwordHash,
      phone: input.phone,
      storeType: input.storeType,
    }),
  )

  const response = created(toLoginResponse(result))
  setRefreshTokenCookie(response, result.refreshToken)
  return response
}

export const POST = compose(withRequestContext, withErrorHandling)(handleSignup)
