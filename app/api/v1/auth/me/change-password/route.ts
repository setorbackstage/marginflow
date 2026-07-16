import "server-only"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/server/db"
import { userService } from "@/server/services"
import { requireAuth, parseJsonBody } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok } from "@/server/lib/http"

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe a senha atual."),
    newPassword: z.string().min(8, "A nova senha deve ter ao menos 8 caracteres."),
    confirmPassword: z.string().min(1, "Confirme a nova senha."),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  })

async function handleChangePassword(request: NextRequest): Promise<Response> {
  const actor = requireAuth(request)
  const { currentPassword, newPassword } = await parseJsonBody(request, changePasswordSchema)
  await userService.changePassword(prisma, actor.userId, currentPassword, newPassword)
  return ok({ message: "Senha alterada com sucesso." })
}

export const POST = compose(withRequestContext, withErrorHandling)(handleChangePassword)
