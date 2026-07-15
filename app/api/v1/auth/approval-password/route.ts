import "server-only"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/server/db"
import { meService } from "@/server/services"
import { requireAuth, parseJsonBody, logAudit } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok } from "@/server/lib/http"

/** API_SPEC.md `PATCH /api/v1/auth/approval-password` — request body. */
const setApprovalPasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newApprovalPassword: z.string().min(8),
})

async function handleSetApprovalPassword(request: NextRequest): Promise<Response> {
  const actor = requireAuth(request)
  const input = await parseJsonBody(request, setApprovalPasswordSchema)

  await meService.setApprovalPassword(prisma, actor.userId, input.currentPassword, input.newApprovalPassword)

  void logAudit(prisma, {
    storeId: "system",
    userId: actor.userId,
    action: "user.approval_password_set",
    entityType: "User",
    entityId: actor.userId,
    entityRef: actor.email,
  })

  return ok({ success: true })
}

export const PATCH = compose(withRequestContext, withErrorHandling)(handleSetApprovalPassword)
