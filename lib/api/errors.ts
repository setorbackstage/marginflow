/** Field-level validation detail — mirrors the backend's ValidationError shape. */
export interface ApiErrorDetail {
  field: string
  message: string
}

/**
 * Normalized client-side representation of the backend's Standard JSON Error
 * Format (`{ code, message, status, details }`). Every failed request from the
 * API client throws one of these, so UI/mutation error handlers can branch on
 * `code`/`status` instead of parsing raw responses.
 */
export class ApiError extends Error {
  readonly code: string
  readonly status: number
  readonly details: ApiErrorDetail[]

  constructor(code: string, message: string, status: number, details: ApiErrorDetail[] = []) {
    super(message)
    this.name = "ApiError"
    this.code = code
    this.status = status
    this.details = details
  }

  get isUnauthorized(): boolean {
    return this.status === 401
  }
  get isForbidden(): boolean {
    return this.status === 403
  }
  get isValidation(): boolean {
    return this.status === 422
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}
