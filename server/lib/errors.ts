import "server-only"

/**
 * Shape of a single field-level validation failure, per API_SPEC.md's
 * "Validation Error Format": { field: dot-notation path, message }.
 */
export interface ErrorDetail {
  field: string
  message: string
}

interface AppErrorParams {
  code: string
  message: string
  status: number
  details?: ErrorDetail[]
}

/**
 * Base of every error the HTTP layer knows how to render. Maps 1:1 to
 * API_SPEC.md's "Standard JSON Error Format": { code, message, status, details }.
 * Feature-specific errors (e.g. an "ORDER_NOT_FOUND" thrown by the Orders
 * service) extend one of the subclasses below with their own `code` and
 * `message` — this file defines the shape, not any specific business error.
 */
export class AppError extends Error {
  readonly code: string
  readonly status: number
  readonly details: ErrorDetail[]

  constructor({ code, message, status, details = [] }: AppErrorParams) {
    super(message)
    this.name = "AppError"
    this.code = code
    this.status = status
    this.details = details
  }
}

/** 422 — request body/query failed format validation. */
export class ValidationError extends AppError {
  constructor(
    details: ErrorDetail[],
    message = "Request validation failed. Check the details array for field-level errors.",
  ) {
    super({ code: "VALIDATION_ERROR", message, status: 422, details })
  }
}

/** 400 — valid format but the operation violates a business rule. */
export class BadRequestError extends AppError {
  constructor(code: string, message: string) {
    super({ code, message, status: 400 })
  }
}

/** 401 — missing or invalid access token. */
export class UnauthorizedError extends AppError {
  constructor(code: string, message: string) {
    super({ code, message, status: 401 })
  }
}

/** 403 — authenticated but lacking store access or permission. */
export class ForbiddenError extends AppError {
  constructor(code: string, message: string) {
    super({ code, message, status: 403 })
  }
}

/** 404 — entity does not exist in this store. */
export class NotFoundError extends AppError {
  constructor(code: string, message: string) {
    super({ code, message, status: 404 })
  }
}

/** 409 — operation cannot be completed in the current state. */
export class ConflictError extends AppError {
  constructor(code: string, message: string) {
    super({ code, message, status: 409 })
  }
}

/** 429 — request rate exceeded. */
export class TooManyRequestsError extends AppError {
  constructor(code = "RATE_LIMIT_EXCEEDED", message = "Too many requests. Please try again later.") {
    super({ code, message, status: 429 })
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}
