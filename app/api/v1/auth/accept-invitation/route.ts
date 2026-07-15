import "server-only"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/server/db"
import { passwordAuthService } from "@/server/services"
import { parseJsonBody, logAudit } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok } from "@/server/lib/http"

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "A senha deve ter no mínimo 8 caracteres"),
})

async function handler(request: NextRequest): Promise<Response> {
  const { token, password } = await parseJsonBody(request, schema)
  await passwordAuthService.acceptInvitation(prisma, token, password)
  void logAudit(prisma, {
    storeId: "system",
    userId: null,
    action: "user.invitation_accepted",
    entityType: "User",
    entityId: null,
    entityRef: null,
  })
  return ok({ message: "Convite aceito. Você já pode fazer login." })
}

export const POST = compose(withRequestContext, withErrorHandling)(handler)
