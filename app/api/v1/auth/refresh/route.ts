import "server-only"
import type { NextRequest } from "next/server"
import { prisma } from "@/server/db"
import { refreshTokenService } from "@/server/services"
import { REFRESH_TOKEN_COOKIE_NAME, UnauthorizedError } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok, setRefreshTokenCookie } from "@/server/lib/http"

async function handleRefresh(request: NextRequest): Promise<Response> {
  const rawToken = request.cookies.get(REFRESH_TOKEN_COOKIE_NAME)?.value
  if (!rawToken) {
    throw new UnauthorizedError("REFRESH_TOKEN_MISSING", "No refresh token cookie present.")
  }

  const result = await refreshTokenService.refresh(prisma, rawToken)

  const response = ok({ accessToken: result.accessToken })
  setRefreshTokenCookie(response, result.refreshToken)
  return response
}

export const POST = compose(withRequestContext, withErrorHandling)(handleRefresh)
