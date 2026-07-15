import { describe, it, expect, vi, beforeEach } from "vitest"
import { ForbiddenError, UnauthorizedError } from "@/server/lib/errors"

// Mock all external dependencies before importing the service
vi.mock("@/server/repositories", () => ({
  userRepository: { findByEmail: vi.fn(), update: vi.fn() },
  membershipRepository: { findManyByUser: vi.fn() },
  storeRepository: { findById: vi.fn() },
  roleRepository: { findById: vi.fn() },
  refreshTokenRepository: { create: vi.fn() },
}))

vi.mock("@/server/lib/auth", () => ({
  verifyPassword: vi.fn(),
  signAccessToken: vi.fn().mockReturnValue("signed-access-token"),
  generateRawToken: vi.fn().mockReturnValue("raw-refresh-token"),
  hashToken: vi.fn().mockReturnValue("hashed-refresh-token"),
  REFRESH_TOKEN_TTL_SECONDS: 2592000,
}))

import { loginService } from "@/server/services/login.service"
import { userRepository, membershipRepository, storeRepository, roleRepository, refreshTokenRepository } from "@/server/repositories"
import { verifyPassword } from "@/server/lib/auth"

const mockUser = userRepository as { findByEmail: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> }
const mockMembership = membershipRepository as { findManyByUser: ReturnType<typeof vi.fn> }
const mockStore = storeRepository as { findById: ReturnType<typeof vi.fn> }
const mockRoleRepo = roleRepository as { findById: ReturnType<typeof vi.fn> }
const mockRefreshToken = refreshTokenRepository as { create: ReturnType<typeof vi.fn> }
const mockVerifyPassword = verifyPassword as ReturnType<typeof vi.fn>

const db = {} as never

const activeUser = {
  id: "user-1",
  email: "owner@store.com",
  passwordHash: "hashed-password",
  status: "ACTIVE",
  lastLoginAt: null,
}

const membership = { id: "mem-1", userId: "user-1", storeId: "store-1", roleId: "role-1", status: "ACTIVE" }
const store = { id: "store-1", name: "Minha Loja" }
const role = { id: "role-1", name: "OWNER", permissions: ["orders:view"] }
const updatedUser = { ...activeUser, lastLoginAt: new Date() }

beforeEach(() => {
  vi.clearAllMocks()
  mockUser.update.mockResolvedValue(updatedUser)
  mockRefreshToken.create.mockResolvedValue({})
})

describe("loginService.login", () => {
  it("throws INVALID_CREDENTIALS when user is not found", async () => {
    mockUser.findByEmail.mockResolvedValue(null)
    await expect(loginService.login(db, { email: "notfound@x.com", password: "pass" })).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
      status: 401,
    })
  })

  it("throws USER_INVITED when user status is INVITED", async () => {
    mockUser.findByEmail.mockResolvedValue({ ...activeUser, status: "INVITED" })
    await expect(loginService.login(db, { email: activeUser.email, password: "pass" })).rejects.toMatchObject({
      code: "USER_INVITED",
      status: 403,
    })
  })

  it("throws USER_INACTIVE when user status is INACTIVE", async () => {
    mockUser.findByEmail.mockResolvedValue({ ...activeUser, status: "INACTIVE" })
    await expect(loginService.login(db, { email: activeUser.email, password: "pass" })).rejects.toMatchObject({
      code: "USER_INACTIVE",
      status: 403,
    })
  })

  it("throws INVALID_CREDENTIALS when password is wrong", async () => {
    mockUser.findByEmail.mockResolvedValue(activeUser)
    mockVerifyPassword.mockResolvedValue(false)
    await expect(loginService.login(db, { email: activeUser.email, password: "wrong" })).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
      status: 401,
    })
  })

  it("returns LoginResult on successful login", async () => {
    mockUser.findByEmail.mockResolvedValue(activeUser)
    mockVerifyPassword.mockResolvedValue(true)
    mockMembership.findManyByUser.mockResolvedValue([membership])
    mockStore.findById.mockResolvedValue(store)
    mockRoleRepo.findById.mockResolvedValue(role)

    const result = await loginService.login(db, { email: activeUser.email, password: "correct" })

    expect(result.user).toEqual(updatedUser)
    expect(result.accessToken).toBe("signed-access-token")
    expect(result.refreshToken).toBe("raw-refresh-token")
    expect(result.memberships).toHaveLength(1)
    expect(result.memberships[0]).toMatchObject({ membership, store, role })
  })

  it("persists only the hashed refresh token, never the raw one", async () => {
    mockUser.findByEmail.mockResolvedValue(activeUser)
    mockVerifyPassword.mockResolvedValue(true)
    mockMembership.findManyByUser.mockResolvedValue([membership])
    mockStore.findById.mockResolvedValue(store)
    mockRoleRepo.findById.mockResolvedValue(role)

    await loginService.login(db, { email: activeUser.email, password: "correct" })

    const createCall = mockRefreshToken.create.mock.calls[0][1]
    expect(createCall.tokenHash).toBe("hashed-refresh-token")
    // raw token must NOT appear in the persisted object
    expect(JSON.stringify(createCall)).not.toContain("raw-refresh-token")
  })

  it("updates lastLoginAt after successful login", async () => {
    mockUser.findByEmail.mockResolvedValue(activeUser)
    mockVerifyPassword.mockResolvedValue(true)
    mockMembership.findManyByUser.mockResolvedValue([membership])
    mockStore.findById.mockResolvedValue(store)
    mockRoleRepo.findById.mockResolvedValue(role)

    await loginService.login(db, { email: activeUser.email, password: "correct" })

    expect(mockUser.update).toHaveBeenCalledWith(db, activeUser.id, expect.objectContaining({ lastLoginAt: expect.any(Date) }))
  })

  it("handles user with no memberships (empty context)", async () => {
    mockUser.findByEmail.mockResolvedValue(activeUser)
    mockVerifyPassword.mockResolvedValue(true)
    mockMembership.findManyByUser.mockResolvedValue([])

    const result = await loginService.login(db, { email: activeUser.email, password: "correct" })
    expect(result.memberships).toHaveLength(0)
  })

  it("returns UnauthorizedError (not ForbiddenError) for missing user or wrong password", async () => {
    mockUser.findByEmail.mockResolvedValue(null)
    const err = await loginService.login(db, { email: "x@x.com", password: "p" }).catch((e) => e)
    expect(err).toBeInstanceOf(UnauthorizedError)

    mockUser.findByEmail.mockResolvedValue(activeUser)
    mockVerifyPassword.mockResolvedValue(false)
    const err2 = await loginService.login(db, { email: activeUser.email, password: "wrong" }).catch((e) => e)
    expect(err2).toBeInstanceOf(UnauthorizedError)
  })

  it("returns ForbiddenError (not UnauthorizedError) for INVITED or INACTIVE user", async () => {
    mockUser.findByEmail.mockResolvedValue({ ...activeUser, status: "INVITED" })
    const err = await loginService.login(db, { email: activeUser.email, password: "p" }).catch((e) => e)
    expect(err).toBeInstanceOf(ForbiddenError)
  })
})
