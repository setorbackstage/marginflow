import "server-only"
import { ValidationError } from "./errors"

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Validates every resolved route param is a well-formed UUID before it
 * reaches a Prisma call — every path parameter in this API is a UUID
 * primary key. Throws `ValidationError` (422 VALIDATION_ERROR) so a
 * malformed ID never reaches the database as an unhandled driver-level
 * type error (500). The single, shared validator for this check — call it
 * with the already-`await`ed route params object, same as `requireAuth`.
 */
export function requireUuidParams<T extends Record<string, string>>(params: T): T {
  const details = Object.entries(params)
    .filter(([, value]) => !UUID_PATTERN.test(value))
    .map(([field, value]) => ({ field, message: `Must be a valid UUID, received "${value}".` }))

  if (details.length > 0) {
    throw new ValidationError(details)
  }

  return params
}
