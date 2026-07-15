/**
 * Signup Service Tests
 *
 * Covers signupService.signup — the service that provisions a complete new
 * tenant in a single atomic transaction:
 *
 *  1. Conflict detection — EMAIL_ALREADY_REGISTERED when a user or account
 *     with the same email already exists.
 *
 *  2. Successful signup — returns a LoginResult equivalent to what
 *     loginService.login returns, so the new owner is immediately authenticated
 *     without a separate login step.
 *
 *  3. Token security — only the hashed refresh token is persisted; the raw
 *     token is returned to the caller (the future session cookie) but must
 *     never appear in the DB write.
 *
 *  4. Role catalog — all built-in roles (OWNER, MANAGER, CASHIER, …) are
 *     provisioned; the returned membership must carry the OWNER role.
 *
 *  5. Slug collision — the service retries slug generation until a free one
 *     is found (appending -2, -3, … on collision).
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { ConflictError } from "@/server/lib/errors"

vi.mock("@/server/repositories", () => ({
  accountRepository: { findByEmail: vi.fn(), create: vi.fn() },
  storeRepository: { findBySlug: vi.fn(), create: vi.fn() },
  storeSettingsRepository: { create: vi.fn() },
  roleRepository: { create: vi.fn() },
  userRepository: { findByEmail: vi.fn(), create: vi.fn() },
  membershipRepository: { create: vi.fn() },
  refreshTokenRepository: { create: vi.fn() },
}))

vi.mock("@/server/lib/auth", () => ({
  signAccessToken: vi.fn().mockReturnValue("signed-access-token"),
  generateRawToken: vi.fn().mockReturnValue("raw-refresh-token"),
  hashToken: vi.fn().mockReturnValue("hashed-refresh-token"),
  REFRESH_TOKEN_TTL_SECONDS: 604800,
}))

import { signupService } from "@/server/services/signup.service"
import {
  accountRepository,
  storeRepository,
  storeSettingsRepository,
  roleRepository,
  userRepository,
  membershipRepository,
  refreshTokenRepository,
} from "@/server/repositories"

const mockAccount = accountRepository as { findByEmail: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> }
const mockStore = storeRepository as { findBySlug: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> }
const mockStoreSettings = storeSettingsRepository as { create: ReturnType<typeof vi.fn> }
const mockRole = roleRepository as { create: ReturnType<typeof vi.fn> }
const mockUser = userRepository as { findByEmail: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> }
const mockMembership = membershipRepository as { create: ReturnType<typeof vi.fn> }
const mockRefreshToken = refreshTokenRepository as { create: ReturnType<typeof vi.fn> }

const db = {} as never

const validInput = {
  storeName: "Restaurante Sabor",
  ownerName: "João Silva",
  email: "joao@sabor.com",
  passwordHash: "hashed-password",
  phone: "11999990000",
  storeType: "RESTAURANT",
}

const createdAccount = { id: "acc-1", name: validInput.storeName, email: validInput.email }
const createdStore = { id: "store-1", name: validInput.storeName, slug: "restaurante-sabor", accountId: "acc-1" }
const createdUser = { id: "user-1", name: validInput.ownerName, email: validInput.email, status: "ACTIVE", lastLoginAt: new Date() }
const createdMembership = { id: "mem-1", userId: "user-1", storeId: "store-1", roleId: "role-OWNER", status: "ACTIVE" }

beforeEach(() => {
  vi.clearAllMocks()

  // No existing user or account by default
  mockUser.findByEmail.mockResolvedValue(null)
  mockAccount.findByEmail.mockResolvedValue(null)

  // No slug collision on first attempt
  mockStore.findBySlug.mockResolvedValue(null)

  // All repository creates succeed
  mockAccount.create.mockResolvedValue(createdAccount)
  mockStore.create.mockResolvedValue(createdStore)
  mockStoreSettings.create.mockResolvedValue({})
  // Each call to roleRepository.create returns a role whose name matches the input
  mockRole.create.mockImplementation((_db, data) =>
    Promise.resolve({
      id: `role-${data.name}`,
      storeId: "store-1",
      name: data.name,
      displayName: data.displayName,
      permissions: data.permissions ?? [],
      isSystemRole: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  )
  mockUser.create.mockResolvedValue(createdUser)
  mockMembership.create.mockResolvedValue(createdMembership)
  mockRefreshToken.create.mockResolvedValue({})
})

// ─────────────────────────────────────────────────────────────────────────
// 1. Conflict detection
// ─────────────────────────────────────────────────────────────────────────

describe("signupService.signup — conflict detection", () => {
  it("throws EMAIL_ALREADY_REGISTERED when a User with that email exists", async () => {
    mockUser.findByEmail.mockResolvedValue({ id: "existing-user" })
    await expect(signupService.signup(db, validInput)).rejects.toMatchObject({
      code: "EMAIL_ALREADY_REGISTERED",
      status: 409,
    })
  })

  it("throws EMAIL_ALREADY_REGISTERED when an Account with that email exists", async () => {
    mockAccount.findByEmail.mockResolvedValue({ id: "existing-account" })
    await expect(signupService.signup(db, validInput)).rejects.toMatchObject({
      code: "EMAIL_ALREADY_REGISTERED",
      status: 409,
    })
  })

  it("throws ConflictError (not ForbiddenError or UnauthorizedError) for email conflicts", async () => {
    mockUser.findByEmail.mockResolvedValue({ id: "existing-user" })
    const err = await signupService.signup(db, validInput).catch((e) => e)
    expect(err).toBeInstanceOf(ConflictError)
  })

  it("does not create any resource when a conflict is detected", async () => {
    mockUser.findByEmail.mockResolvedValue({ id: "existing-user" })
    await signupService.signup(db, validInput).catch(() => {})
    expect(mockAccount.create).not.toHaveBeenCalled()
    expect(mockStore.create).not.toHaveBeenCalled()
    expect(mockUser.create).not.toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────────────
// 2. Successful signup — LoginResult shape
// ─────────────────────────────────────────────────────────────────────────

describe("signupService.signup — LoginResult", () => {
  it("returns a signed access token and the raw refresh token", async () => {
    const result = await signupService.signup(db, validInput)
    expect(result.accessToken).toBe("signed-access-token")
    expect(result.refreshToken).toBe("raw-refresh-token")
  })

  it("returns the created user object", async () => {
    const result = await signupService.signup(db, validInput)
    expect(result.user).toEqual(createdUser)
  })

  it("returns exactly one membership carrying the OWNER role and the created store", async () => {
    const result = await signupService.signup(db, validInput)
    expect(result.memberships).toHaveLength(1)
    expect(result.memberships[0].role.name).toBe("OWNER")
    expect(result.memberships[0].store).toEqual(createdStore)
    expect(result.memberships[0].membership).toEqual(createdMembership)
  })
})

// ─────────────────────────────────────────────────────────────────────────
// 3. Token security
// ─────────────────────────────────────────────────────────────────────────

describe("signupService.signup — token security", () => {
  it("persists only the hashed refresh token, never the raw one", async () => {
    await signupService.signup(db, validInput)
    const persistedData = mockRefreshToken.create.mock.calls[0][1]
    expect(persistedData.tokenHash).toBe("hashed-refresh-token")
    expect(JSON.stringify(persistedData)).not.toContain("raw-refresh-token")
  })
})

// ─────────────────────────────────────────────────────────────────────────
// 4. Role catalog provisioning
// ─────────────────────────────────────────────────────────────────────────

describe("signupService.signup — built-in role catalog", () => {
  it("provisions OWNER, MANAGER, and CASHIER roles (minimum required by API_SPEC.md)", async () => {
    await signupService.signup(db, validInput)
    const createdRoleNames = mockRole.create.mock.calls.map((c) => c[1].name as string)
    expect(createdRoleNames).toContain("OWNER")
    expect(createdRoleNames).toContain("MANAGER")
    expect(createdRoleNames).toContain("CASHIER")
  })

  it("provisions more than one role (the full built-in catalog, not just OWNER)", async () => {
    await signupService.signup(db, validInput)
    expect(mockRole.create.mock.calls.length).toBeGreaterThan(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────
// 5. Slug collision retry
// ─────────────────────────────────────────────────────────────────────────

describe("signupService.signup — slug collision retry", () => {
  it("retries until a free slug is found when the base slug is already taken", async () => {
    // First 2 candidates are taken; 3rd is free
    mockStore.findBySlug
      .mockResolvedValueOnce({ id: "taken-1" }) // base slug
      .mockResolvedValueOnce({ id: "taken-2" }) // base-2
      .mockResolvedValue(null) //                 base-3 → free

    await signupService.signup(db, validInput)

    expect(mockStore.findBySlug).toHaveBeenCalledTimes(3)
  })

  it("succeeds on the first attempt when no slug collision exists", async () => {
    mockStore.findBySlug.mockResolvedValue(null)
    await signupService.signup(db, validInput)
    expect(mockStore.findBySlug).toHaveBeenCalledTimes(1)
  })
})
