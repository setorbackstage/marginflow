import "server-only"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/server/db"
import { passwordAuthService } from "@/server/services"
import { parseJsonBody } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok } from "@/server/lib/http"
import { rateLimit, getClientIp } from "@/server/lib/rate-limit"

const schema = z.object({
  email: z.string().email(),
})

async function handler(request: NextRequest): Promise<Response> {
  const ip = getClientIp(request)
  const result = rateLimit(`forgot-password:${ip}`, 5, 60_000)
  if (!result.allowed) {
    return new Response(
      JSON.stringify({ error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many requests. Please try again later.", status: 429 } }),
      { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)) } },
    )
  }
  const { email } = await parseJsonBody(request, schema)
  await passwordAuthService.forgotPassword(prisma, email)
  // Always 200 — never reveal whether email exists
  return ok({ message: "Se esse e-mail estiver cadastrado, você receberá as instruções em breve." })
}

export const POST = compose(withRequestContext, withErrorHandling)(handler)
