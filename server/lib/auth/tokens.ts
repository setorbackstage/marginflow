import "server-only"
import { createHash, randomUUID } from "node:crypto"

/**
 * Generates a high-entropy opaque token. API_SPEC.md's Password Reset Flow:
 * "a unique, time-limited token (UUID)" — the same shape is used for
 * refresh and invitation tokens.
 */
export function generateRawToken(): string {
  return randomUUID()
}

/**
 * Hashes an opaque token for storage — SHA-256, not a slow KDF. Refresh,
 * reset, and invitation tokens are high-entropy random values (unlike
 * passwords), so a fast cryptographic hash is the correct, standard
 * choice; scrypt/bcrypt (see password.ts) would be the wrong tool here.
 */
export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex")
}
