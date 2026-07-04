import "server-only"
import type { NextRequest } from "next/server"
import { UnauthorizedError } from "./errors"
import { verifyAccessToken } from "./auth"
import type { AuthenticatedActor } from "./auth"

const BEARER_PREFIX = "Bearer "

/**
 * Extracts and verifies the `Authorization: Bearer {token}` header per
 * API_SPEC.md's "Authentication Header" convention. Used by any route
 * where API_SPEC.md marks "Authentication required: Yes".
 *
 * API_SPEC.md documents only `ACCESS_TOKEN_EXPIRED` and `ACCESS_TOKEN_INVALID`
 * as the 401 codes for this header (no separate "missing" code) — a missing
 * or malformed header is treated as `ACCESS_TOKEN_INVALID`.
 */
export function requireAuth(request: NextRequest): AuthenticatedActor {
  const header = request.headers.get("authorization")
  if (!header || !header.startsWith(BEARER_PREFIX)) {
    throw new UnauthorizedError("ACCESS_TOKEN_INVALID", "Missing or malformed Authorization header.")
  }

  const payload = verifyAccessToken(header.slice(BEARER_PREFIX.length))
  return { userId: payload.sub, email: payload.email }
}
