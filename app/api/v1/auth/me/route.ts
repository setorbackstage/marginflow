import "server-only"
import type { NextRequest } from "next/server"
import { prisma } from "@/server/db"
import { meService } from "@/server/services"
import type { MeProfile } from "@/server/services"
import { requireAuth } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok } from "@/server/lib/http"

/** API_SPEC.md `GET /api/v1/auth/me` — response envelope shape. */
function toMeResponse(profile: MeProfile) {
  return {
    user: {
      id: profile.user.id,
      name: profile.user.name,
      email: profile.user.email,
      phone: profile.user.phone,
      avatarUrl: profile.user.avatarUrl,
      status: profile.user.status,
      lastLoginAt: profile.user.lastLoginAt,
      createdAt: profile.user.createdAt,
    },
    memberships: profile.memberships.map(({ membership, store, role }) => ({
      storeId: store.id,
      storeName: store.name,
      storeSlug: store.slug,
      storeLogoUrl: store.logoUrl,
      membershipStatus: membership.status,
      role: {
        id: role.id,
        name: role.name,
        displayName: role.displayName,
        permissions: role.permissions,
      },
    })),
  }
}

async function handleMe(request: NextRequest): Promise<Response> {
  const actor = requireAuth(request)
  const profile = await meService.getProfile(prisma, actor.userId)
  return ok(toMeResponse(profile))
}

export const GET = compose(withRequestContext, withErrorHandling)(handleMe)
