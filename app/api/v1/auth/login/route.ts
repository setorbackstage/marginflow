import "server-only"
import type { NextRequest } from "next/server"
import { prisma } from "@/server/db"
import { loginService } from "@/server/services"
import { loginSchema, parseJsonBody } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok, setRefreshTokenCookie } from "@/server/lib/http"
import type { LoginResult } from "@/server/services"

/** API_SPEC.md `POST /api/v1/auth/login` — response envelope shape. */
function toLoginResponse(result: LoginResult) {
  return {
    accessToken: result.accessToken,
    user: {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      avatarUrl: result.user.avatarUrl,
      status: result.user.status,
    },
    memberships: result.memberships.map(({ membership, store, role }) => ({
      storeId: store.id,
      storeName: store.name,
      storeSlug: store.slug,
      status: membership.status,
      role: {
        id: role.id,
        name: role.name,
        displayName: role.displayName,
        permissions: role.permissions,
      },
    })),
  }
}

async function handleLogin(request: NextRequest): Promise<Response> {
  const input = await parseJsonBody(request, loginSchema)
  const result = await loginService.login(prisma, input)

  const response = ok(toLoginResponse(result))
  setRefreshTokenCookie(response, result.refreshToken)
  return response
}

export const POST = compose(withRequestContext, withErrorHandling)(handleLogin)
