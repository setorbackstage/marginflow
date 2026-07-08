import "server-only"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/server/db"
import { passwordAuthService } from "@/server/services"
import { parseJsonBody } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok } from "@/server/lib/http"

const schema = z.object({
  email: z.string().email(),
})

async function handler(request: NextRequest): Promise<Response> {
  const { email } = await parseJsonBody(request, schema)
  await passwordAuthService.forgotPassword(prisma, email)
  // Always 200 — never reveal whether email exists
  return ok({ message: "Se esse e-mail estiver cadastrado, você receberá as instruções em breve." })
}

export const POST = compose(withRequestContext, withErrorHandling)(handler)
