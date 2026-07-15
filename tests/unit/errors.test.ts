import { describe, it, expect } from "vitest"
import {
  AppError,
  ValidationError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  TooManyRequestsError,
  isAppError,
} from "@/server/lib/errors"

describe("AppError", () => {
  it("sets code, status, message and details", () => {
    const err = new AppError({ code: "TEST_CODE", message: "test msg", status: 500 })
    expect(err.code).toBe("TEST_CODE")
    expect(err.status).toBe(500)
    expect(err.message).toBe("test msg")
    expect(err.details).toEqual([])
  })

  it("accepts details array", () => {
    const details = [{ field: "email", message: "required" }]
    const err = new AppError({ code: "X", message: "m", status: 400, details })
    expect(err.details).toEqual(details)
  })

  it("is instanceof Error", () => {
    const err = new AppError({ code: "X", message: "m", status: 400 })
    expect(err).toBeInstanceOf(Error)
  })
})

describe("ValidationError", () => {
  it("has status 422 and code VALIDATION_ERROR", () => {
    const err = new ValidationError([{ field: "name", message: "required" }])
    expect(err.status).toBe(422)
    expect(err.code).toBe("VALIDATION_ERROR")
  })

  it("carries field-level details", () => {
    const details = [{ field: "price", message: "must be positive" }]
    const err = new ValidationError(details)
    expect(err.details).toEqual(details)
  })

  it("accepts a custom message", () => {
    const err = new ValidationError([], "Custom message")
    expect(err.message).toBe("Custom message")
  })
})

describe("BadRequestError", () => {
  it("has status 400", () => {
    const err = new BadRequestError("ORDER_CLOSED", "Order is already closed")
    expect(err.status).toBe(400)
    expect(err.code).toBe("ORDER_CLOSED")
    expect(err.message).toBe("Order is already closed")
  })
})

describe("UnauthorizedError", () => {
  it("has status 401", () => {
    const err = new UnauthorizedError("INVALID_TOKEN", "Token expired")
    expect(err.status).toBe(401)
    expect(err.code).toBe("INVALID_TOKEN")
  })
})

describe("ForbiddenError", () => {
  it("has status 403", () => {
    const err = new ForbiddenError("INSUFFICIENT_PERMISSIONS", "Access denied")
    expect(err.status).toBe(403)
    expect(err.code).toBe("INSUFFICIENT_PERMISSIONS")
  })
})

describe("NotFoundError", () => {
  it("has status 404", () => {
    const err = new NotFoundError("PRODUCT_NOT_FOUND", "Product not found")
    expect(err.status).toBe(404)
    expect(err.code).toBe("PRODUCT_NOT_FOUND")
  })
})

describe("ConflictError", () => {
  it("has status 409", () => {
    const err = new ConflictError("EMAIL_TAKEN", "Email already registered")
    expect(err.status).toBe(409)
    expect(err.code).toBe("EMAIL_TAKEN")
  })
})

describe("TooManyRequestsError", () => {
  it("has status 429 and default code/message", () => {
    const err = new TooManyRequestsError()
    expect(err.status).toBe(429)
    expect(err.code).toBe("RATE_LIMIT_EXCEEDED")
    expect(err.message).toContain("Too many requests")
  })

  it("accepts custom code and message", () => {
    const err = new TooManyRequestsError("CUSTOM_CODE", "Custom msg")
    expect(err.code).toBe("CUSTOM_CODE")
    expect(err.message).toBe("Custom msg")
  })
})

describe("isAppError", () => {
  it("returns true for AppError instances", () => {
    expect(isAppError(new NotFoundError("X", "y"))).toBe(true)
    expect(isAppError(new ValidationError([]))).toBe(true)
  })

  it("returns false for plain Error instances", () => {
    expect(isAppError(new Error("plain"))).toBe(false)
  })

  it("returns false for non-error values", () => {
    expect(isAppError(null)).toBe(false)
    expect(isAppError("string")).toBe(false)
    expect(isAppError(42)).toBe(false)
  })
})
