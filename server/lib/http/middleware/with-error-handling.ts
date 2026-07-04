import "server-only"
import { NextResponse } from "next/server"
import { logger } from "../../logger"
import { isAppError } from "../../errors"

/** Renders any thrown error as API_SPEC.md's "Standard JSON Error Format". Never leaks a stack trace. */
function toErrorResponse(error: unknown): NextResponse {
  if (isAppError(error)) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message, status: error.status, details: error.details } },
      { status: error.status },
    )
  }

  logger.error("unhandled_route_error", {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  })

  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred.",
        status: 500,
        details: [],
      },
    },
    { status: 500 },
  )
}

/**
 * Wraps a route handler so any thrown `AppError` (or unknown error) is
 * converted into the standard error envelope instead of crashing the
 * request. Every route handler should be wrapped with this.
 */
export function withErrorHandling<T extends (...args: never[]) => Promise<Response>>(handler: T): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args)
    } catch (error) {
      return toErrorResponse(error)
    }
  }) as T
}
