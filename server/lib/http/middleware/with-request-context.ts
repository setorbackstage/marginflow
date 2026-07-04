import "server-only"
import type { NextRequest } from "next/server"
import { logger } from "../../logger"

/**
 * Wraps a route handler to log request start/end and stamp every response
 * with an `x-request-id` header, so a single request can be correlated
 * across log lines. No auth, no business logic — pure request tracing.
 */
export function withRequestContext<T extends (request: NextRequest, ...rest: never[]) => Promise<Response>>(
  handler: T,
): T {
  return (async (request: NextRequest, ...rest: never[]) => {
    const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID()
    const start = Date.now()

    logger.info("request.start", { requestId, method: request.method, path: request.nextUrl.pathname })

    const response = await handler(request, ...rest)
    response.headers.set("x-request-id", requestId)

    logger.info("request.end", {
      requestId,
      method: request.method,
      path: request.nextUrl.pathname,
      status: response.status,
      durationMs: Date.now() - start,
    })

    return response
  }) as T
}
