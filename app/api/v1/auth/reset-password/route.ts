import "server-only"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/server/db"
import { passwordAuthService } from "@/server/services"
import { parseJsonBody, logAudit } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok } from "@/server/lib/http"
import { rateLimit, getClientIp } from "@/server/lib/rate-limit"

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "A senha deve ter no mínimo 8 caracteres"),
})

async function handler(request: NextRequest): Promise<Response> {
  const ip = getClientIp(request)
  const result = rateLimit(`reset-password:${ip}`, 10, 60_000)
  if (!result.allowed) {
    return new Response(
      JSON.stringify({ error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many requests. Please try again later.", status: 429 } }),
      { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)) } },
    )
  }
  const { token, password } = await parseJsonBody(request, schema)
  await passwordAuthService.resetPassword(prisma, token, password)
  void logAudit(prisma, {
    storeId: "system",
    userId: null,
    action: "user.password_reset_completed",
    entityType: "User",
    entityId: null,
    entityRef: null,
  })
  return ok({ message: "Senha redefinida com sucesso." })
}

export const POST = compose(withRequestContext, withErrorHandling)(handler)
