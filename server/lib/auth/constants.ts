import "server-only"

/** API_SPEC.md — JWT Strategy: Access Token. */
export const ACCESS_TOKEN_ALGORITHM = "RS256"
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60

/** API_SPEC.md — JWT Strategy: Refresh Token. */
export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60
export const REFRESH_TOKEN_COOKIE_NAME = "mf_refresh_token"

/** API_SPEC.md — Password Reset Flow: "checks expiry (60 minutes)". */
export const PASSWORD_RESET_TOKEN_TTL_SECONDS = 60 * 60

/** API_SPEC.md — Invitation Flow: "Tokens expire after 72 hours." */
export const INVITATION_TOKEN_TTL_SECONDS = 72 * 60 * 60

/** API_SPEC.md — POST /auth/reset-password: "Minimum 8 characters". */
export const MIN_PASSWORD_LENGTH = 8
