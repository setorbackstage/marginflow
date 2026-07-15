import { describe, it, expect, beforeEach, vi } from "vitest"

// We import only the pure rateLimit function — getClientIp depends on NextRequest
// and is tested separately via type-only checks.
let rateLimit: typeof import("@/server/lib/rate-limit").rateLimit

beforeEach(async () => {
  // Re-import the module fresh each test so the in-process Map is reset.
  vi.resetModules()
  const mod = await import("@/server/lib/rate-limit")
  rateLimit = mod.rateLimit
})

describe("rateLimit", () => {
  it("allows first request and returns remaining = limit - 1", () => {
    const result = rateLimit("test-key-1", 5, 60_000)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(4)
    expect(result.resetAt).toBeGreaterThan(Date.now())
  })

  it("allows requests up to the limit", () => {
    for (let i = 0; i < 5; i++) {
      const r = rateLimit("test-key-2", 5, 60_000)
      expect(r.allowed).toBe(true)
    }
  })

  it("blocks the request that exceeds the limit", () => {
    for (let i = 0; i < 5; i++) {
      rateLimit("test-key-3", 5, 60_000)
    }
    const blocked = rateLimit("test-key-3", 5, 60_000)
    expect(blocked.allowed).toBe(false)
    expect(blocked.remaining).toBe(0)
  })

  it("isolates counters by key", () => {
    for (let i = 0; i < 5; i++) rateLimit("key-a", 5, 60_000)
    const blocked = rateLimit("key-a", 5, 60_000)
    expect(blocked.allowed).toBe(false)

    // key-b is untouched — first request must be allowed
    const fresh = rateLimit("key-b", 5, 60_000)
    expect(fresh.allowed).toBe(true)
    expect(fresh.remaining).toBe(4)
  })

  it("resets the counter after the window expires", async () => {
    // Exhaust the window with a 50ms duration
    for (let i = 0; i < 3; i++) rateLimit("expire-key", 3, 50)
    const blocked = rateLimit("expire-key", 3, 50)
    expect(blocked.allowed).toBe(false)

    // Wait for window to expire
    await new Promise((r) => setTimeout(r, 60))

    // Should be fresh again
    const fresh = rateLimit("expire-key", 3, 50)
    expect(fresh.allowed).toBe(true)
    expect(fresh.remaining).toBe(2)
  })

  it("returns the same resetAt for all requests within the same window", () => {
    const first = rateLimit("same-window", 10, 60_000)
    const second = rateLimit("same-window", 10, 60_000)
    expect(first.resetAt).toBe(second.resetAt)
  })

  it("remaining never goes below 0", () => {
    for (let i = 0; i < 20; i++) rateLimit("floor-key", 3, 60_000)
    const r = rateLimit("floor-key", 3, 60_000)
    expect(r.remaining).toBe(0)
  })
})
