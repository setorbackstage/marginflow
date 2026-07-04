import "server-only"
import type { NextRequest } from "next/server"
import { prisma } from "@/server/db"
import { logoutService } from "@/server/services"
import { REFRESH_TOKEN_COOKIE_NAME, requireAuth } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, noContent } from "@/server/lib/http"

async function handleLogout(request: NextRequest): Promise<Response> {
  requireAuth(request)

  const rawRefreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE_NAME)?.value
  if (rawRefreshToken) {
    await logoutService.logout(prisma, rawRefreshToken)
  }

  const response = noContent()
  response.cookies.delete(REFRESH_TOKEN_COOKIE_NAME)
  return response
}

export const POST = compose(withRequestContext, withErrorHandling)(handleLogout)
