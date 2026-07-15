import { describe, it, expect, vi, beforeEach } from "vitest"
import { ForbiddenError } from "@/server/lib/errors"

// Mock repositories before importing the service
vi.mock("@/server/repositories", () => ({
  membershipRepository: { findByUserAndStore: vi.fn() },
  roleRepository: { findById: vi.fn() },
  userRepository: { findByEmail: vi.fn() },
}))

// Mock auth lib to avoid native crypto issues
vi.mock("@/server/lib/auth", () => ({
  verifyPassword: vi.fn(),
}))

import { authorizationService } from "@/server/services/authorization.service"
import { membershipRepository, roleRepository, userRepository } from "@/server/repositories"
import { verifyPassword } from "@/server/lib/auth"

// Typed mocks
const mockMembership = membershipRepository as {
  findByUserAndStore: ReturnType<typeof vi.fn>
}
const mockRole = roleRepository as { findById: ReturnType<typeof vi.fn> }
const mockUser = userRepository as { findByEmail: ReturnType<typeof vi.fn> }
const mockVerifyPassword = verifyPassword as ReturnType<typeof vi.fn>

// Reusable fixtures
const db = {} as never // Services receive db but pass it straight to repositories
const userId = "user-1"
const storeId = "store-1"

const activeMembership = {
  id: "mem-1",
  userId,
  storeId,
  roleId: "role-1",
  status: "ACTIVE",
}

const ownerRole = {
  id: "role-1",
  name: "OWNER",
  permissions: ["orders:view", "orders:create", "settings:edit", "billing:manage"],
}

const cashierRole = {
  id: "role-2",
  name: "CASHIER",
  permissions: ["orders:view", "orders:create"],
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("authorizationService.getActiveRole", () => {
  it("returns null when user has no membership at the store", async () => {
    mockMembership.findByUserAndStore.mockResolvedValue(null)
    const result = await authorizationService.getActiveRole(db, userId, storeId)
    expect(result).toBeNull()
  })

  it("returns null when membership status is not ACTIVE", async () => {
    mockMembership.findByUserAndStore.mockResolvedValue({ ...activeMembership, status: "INACTIVE" })
    const result = await authorizationService.getActiveRole(db, userId, storeId)
    expect(result).toBeNull()
    expect(mockRole.findById).not.toHaveBeenCalled()
  })

  it("returns the role when membership is ACTIVE", async () => {
    mockMembership.findByUserAndStore.mockResolvedValue(activeMembership)
    mockRole.findById.mockResolvedValue(ownerRole)
    const result = await authorizationService.getActiveRole(db, userId, storeId)
    expect(result).toEqual(ownerRole)
    expect(mockRole.findById).toHaveBeenCalledWith(db, "role-1")
  })
})

describe("authorizationService.hasPermission", () => {
  it("returns false when user has no active membership", async () => {
    mockMembership.findByUserAndStore.mockResolvedValue(null)
    const result = await authorizationService.hasPermission(db, userId, storeId, "orders:create")
    expect(result).toBe(false)
  })

  it("returns true when role has the permission", async () => {
    mockMembership.findByUserAndStore.mockResolvedValue(activeMembership)
    mockRole.findById.mockResolvedValue(ownerRole)
    const result = await authorizationService.hasPermission(db, userId, storeId, "billing:manage")
    expect(result).toBe(true)
  })

  it("returns false when role lacks the permission", async () => {
    mockMembership.findByUserAndStore.mockResolvedValue(activeMembership)
    mockRole.findById.mockResolvedValue(cashierRole)
    const result = await authorizationService.hasPermission(db, userId, storeId, "billing:manage")
    expect(result).toBe(false)
  })
})

describe("authorizationService.requirePermission", () => {
  it("throws STORE_ACCESS_DENIED when user has no active membership", async () => {
    mockMembership.findByUserAndStore.mockResolvedValue(null)
    await expect(authorizationService.requirePermission(db, userId, storeId, "orders:view")).rejects.toThrow(
      ForbiddenError,
    )
    await expect(authorizationService.requirePermission(db, userId, storeId, "orders:view")).rejects.toMatchObject({
      code: "STORE_ACCESS_DENIED",
      status: 403,
    })
  })

  it("throws INSUFFICIENT_PERMISSIONS when user has membership but lacks the permission", async () => {
    mockMembership.findByUserAndStore.mockResolvedValue(activeMembership)
    mockRole.findById.mockResolvedValue(cashierRole)
    await expect(authorizationService.requirePermission(db, userId, storeId, "billing:manage")).rejects.toMatchObject({
      code: "INSUFFICIENT_PERMISSIONS",
      status: 403,
    })
  })

  it("returns the role when user has the required permission", async () => {
    mockMembership.findByUserAndStore.mockResolvedValue(activeMembership)
    mockRole.findById.mockResolvedValue(ownerRole)
    const role = await authorizationService.requirePermission(db, userId, storeId, "orders:create")
    expect(role).toEqual(ownerRole)
  })
})

describe("authorizationService.isManagerOrOwner", () => {
  it("returns true for OWNER role", async () => {
    mockMembership.findByUserAndStore.mockResolvedValue(activeMembership)
    mockRole.findById.mockResolvedValue(ownerRole)
    expect(await authorizationService.isManagerOrOwner(db, userId, storeId)).toBe(true)
  })

  it("returns true for MANAGER role", async () => {
    mockMembership.findByUserAndStore.mockResolvedValue(activeMembership)
    mockRole.findById.mockResolvedValue({ ...ownerRole, name: "MANAGER" })
    expect(await authorizationService.isManagerOrOwner(db, userId, storeId)).toBe(true)
  })

  it("returns false for CASHIER role", async () => {
    mockMembership.findByUserAndStore.mockResolvedValue(activeMembership)
    mockRole.findById.mockResolvedValue(cashierRole)
    expect(await authorizationService.isManagerOrOwner(db, userId, storeId)).toBe(false)
  })

  it("returns false when user has no membership", async () => {
    mockMembership.findByUserAndStore.mockResolvedValue(null)
    expect(await authorizationService.isManagerOrOwner(db, userId, storeId)).toBe(false)
  })
})

describe("authorizationService.verifyManagerCredentials", () => {
  const managerUser = {
    id: "manager-1",
    email: "manager@store.com",
    status: "ACTIVE",
    approvalPasswordHash: "hashed-approval",
    passwordHash: "hashed-main",
  }

  it("returns false when user is not found", async () => {
    mockUser.findByEmail.mockResolvedValue(null)
    const result = await authorizationService.verifyManagerCredentials(db, storeId, "notfound@x.com", "pass")
    expect(result).toBe(false)
  })

  it("returns false when user is INACTIVE", async () => {
    mockUser.findByEmail.mockResolvedValue({ ...managerUser, status: "INACTIVE" })
    const result = await authorizationService.verifyManagerCredentials(db, storeId, managerUser.email, "pass")
    expect(result).toBe(false)
  })

  it("returns false when approvalPasswordHash is null (not set)", async () => {
    mockUser.findByEmail.mockResolvedValue({ ...managerUser, approvalPasswordHash: null })
    const result = await authorizationService.verifyManagerCredentials(db, storeId, managerUser.email, "pass")
    expect(result).toBe(false)
    expect(mockVerifyPassword).not.toHaveBeenCalled()
  })

  it("returns false when approval password does not match", async () => {
    mockUser.findByEmail.mockResolvedValue(managerUser)
    mockVerifyPassword.mockResolvedValue(false)
    const result = await authorizationService.verifyManagerCredentials(db, storeId, managerUser.email, "wrong")
    expect(result).toBe(false)
  })

  it("returns true for OWNER with correct approval password", async () => {
    mockUser.findByEmail.mockResolvedValue(managerUser)
    mockVerifyPassword.mockResolvedValue(true)
    mockMembership.findByUserAndStore.mockResolvedValue(activeMembership)
    mockRole.findById.mockResolvedValue(ownerRole)
    const result = await authorizationService.verifyManagerCredentials(db, storeId, managerUser.email, "correct")
    expect(result).toBe(true)
  })

  it("returns false for CASHIER even with correct approval password", async () => {
    mockUser.findByEmail.mockResolvedValue(managerUser)
    mockVerifyPassword.mockResolvedValue(true)
    mockMembership.findByUserAndStore.mockResolvedValue(activeMembership)
    mockRole.findById.mockResolvedValue(cashierRole)
    const result = await authorizationService.verifyManagerCredentials(db, storeId, managerUser.email, "correct")
    expect(result).toBe(false)
  })
})
