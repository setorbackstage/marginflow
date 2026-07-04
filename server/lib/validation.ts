import "server-only"
import type { NextRequest } from "next/server"
import type { ZodError, ZodType } from "zod"
import { ValidationError, type ErrorDetail } from "./errors"

function toErrorDetails(error: ZodError): ErrorDetail[] {
  return error.issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join(".") : "root",
    message: issue.message,
  }))
}

/**
 * Parses and validates a request's JSON body against a Zod schema. Throws a
 * `ValidationError` (422, field-level `details`) on failure — matching
 * API_SPEC.md's "Validation Error Format" exactly.
 */
export async function parseJsonBody<T>(request: NextRequest, schema: ZodType<T>): Promise<T> {
  let json: unknown
  try {
    json = await request.json()
  } catch {
    throw new ValidationError([{ field: "body", message: "Request body must be valid JSON." }])
  }

  const result = schema.safeParse(json)
  if (!result.success) {
    throw new ValidationError(toErrorDetails(result.error))
  }
  return result.data
}

/**
 * Parses and validates a request's query string against a Zod schema. Throws
 * a `ValidationError` on failure, same shape as `parseJsonBody`.
 */
export function parseQuery<T>(searchParams: URLSearchParams, schema: ZodType<T>): T {
  const raw = Object.fromEntries(searchParams.entries())
  const result = schema.safeParse(raw)
  if (!result.success) {
    throw new ValidationError(toErrorDetails(result.error))
  }
  return result.data
}
