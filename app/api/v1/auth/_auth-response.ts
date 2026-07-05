import "server-only"
import type { LoginResult } from "@/server/services"

/**
 * API_SPEC.md `POST /api/v1/auth/login` — response envelope shape. Shared
 * with `POST /api/v1/auth/signup`, which returns an identical session
 * envelope (a brand-new owner is authenticated immediately, without a
 * separate login step).
 */
export function toLoginResponse(result: LoginResult) {
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
