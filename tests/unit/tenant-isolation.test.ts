/**
 * Tenant Isolation Tests
 *
 * Validates that the RBAC layer prevents cross-tenant data access.
 * Every route handler calls `authorizationService.requirePermission(db, userId, storeId, permission)`
 * before touching data — these tests confirm that the guard correctly rejects:
 *   1. A user with no membership at the requested store
 *   2. A user with a membership at a DIFFERENT store
 *   3. A user with an INACTIVE membership at the requested store
 *   4. A user whose role lacks the required permission
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { ForbiddenError } from "@/server/lib/errors"

vi.mock("@/server/repositories", () => ({
  membershipRepository: { findByUserAndStore: vi.fn() },
  roleRepository: { findById: vi.fn() },
  userRepository: { findByEmail: vi.fn() },
}))
vi.mock("@/server/lib/auth", () => ({ verifyPassword: vi.fn() }))

import { authorizationService } from "@/server/services/authorization.service"
import { membershipRepository, roleRepository } from "@/server/repositories"

const mockMembership = membershipRepository as { findByUserAndStore: ReturnType<typeof vi.fn> }
const mockRole = roleRepository as { findById: ReturnType<typeof vi.fn> }
const db = {} as never

// Two distinct stores
const STORE_A = "store-aaaa"
const STORE_B = "store-bbbb"

// Two distinct users
const USER_A = "user-aaaa" // belongs to STORE_A
const USER_B = "user-bbbb" // belongs to STORE_B

const ownerRole = { id: "role-owner", name: "OWNER", permissions: ["orders:view", "orders:create", "settings:edit"] }
const cashierRole = { id: "role-cashier", name: "CASHIER", permissions: ["orders:view", "orders:create"] }

const activeMembershipA = { id: "mem-a", userId: USER_A, storeId: STORE_A, roleId: ownerRole.id, status: "ACTIVE" }
const activeMembershipB = { id: "mem-b", userId: USER_B, storeId: STORE_B, roleId: ownerRole.id, status: "ACTIVE" }

beforeEach(() => vi.clearAllMocks())

describe("Cross-tenant access denial", () => {
  it("blocks user A from accessing store B (no membership)", async () => {
    // User A has membership only at STORE_A; findByUserAndStore for STORE_B returns null
    mockMembership.findByUserAndStore.mockImplementation((_db: unknown, userId: string, storeId: string) => {
      if (userId === USER_A && storeId === STORE_A) return Promise.resolve(activeMembershipA)
      return Promise.resolve(null)
    })

    // User A trying to read orders at STORE_B → must be denied
    await expect(authorizationService.requirePermission(db, USER_A, STORE_B, "orders:view")).rejects.toMatchObject({
      code: "STORE_ACCESS_DENIED",
      status: 403,
    })
  })

  it("blocks user B from accessing store A (no membership)", async () => {
    mockMembership.findByUserAndStore.mockImplementation((_db: unknown, userId: string, storeId: string) => {
      if (userId === USER_B && storeId === STORE_B) return Promise.resolve(activeMembershipB)
      return Promise.resolve(null)
    })

    await expect(authorizationService.requirePermission(db, USER_B, STORE_A, "orders:view")).rejects.toMatchObject({
      code: "STORE_ACCESS_DENIED",
      status: 403,
    })
  })

  it("blocks a user whose membership at the target store is INACTIVE", async () => {
    const inactiveMembership = { ...activeMembershipA, status: "INACTIVE" }
    mockMembership.findByUserAndStore.mockResolvedValue(inactiveMembership)

    await expect(authorizationService.requirePermission(db, USER_A, STORE_A, "orders:view")).rejects.toMatchObject({
      code: "STORE_ACCESS_DENIED",
      status: 403,
    })
    // role should never be fetched for an inactive membership
    expect(mockRole.findById).not.toHaveBeenCalled()
  })

  it("allows user A at store A when membership is active and permission exists", async () => {
    mockMembership.findByUserAndStore.mockResolvedValue(activeMembershipA)
    mockRole.findById.mockResolvedValue(ownerRole)

    const role = await authorizationService.requirePermission(db, USER_A, STORE_A, "orders:create")
    expect(role.name).toBe("OWNER")
  })
})

describe("Permission scope within a store", () => {
  it("blocks CASHIER from accessing settings:edit at their own store", async () => {
    mockMembership.findByUserAndStore.mockResolvedValue({ ...activeMembershipA, roleId: cashierRole.id })
    mockRole.findById.mockResolvedValue(cashierRole)

    await expect(authorizationService.requirePermission(db, USER_A, STORE_A, "settings:edit")).rejects.toMatchObject({
      code: "INSUFFICIENT_PERMISSIONS",
      status: 403,
    })
  })

  it("throws ForbiddenError (not UnauthorizedError) for both access-denied cases", async () => {
    // Case 1: no membership
    mockMembership.findByUserAndStore.mockResolvedValue(null)
    const err1 = await authorizationService.requirePermission(db, USER_A, STORE_B, "orders:view").catch((e) => e)
    expect(err1).toBeInstanceOf(ForbiddenError)

    // Case 2: insufficient permissions
    mockMembership.findByUserAndStore.mockResolvedValue({ ...activeMembershipA, roleId: cashierRole.id })
    mockRole.findById.mockResolvedValue(cashierRole)
    const err2 = await authorizationService.requirePermission(db, USER_A, STORE_A, "settings:edit").catch((e) => e)
    expect(err2).toBeInstanceOf(ForbiddenError)
  })

  it("CASHIER can create orders at their own store", async () => {
    mockMembership.findByUserAndStore.mockResolvedValue({ ...activeMembershipA, roleId: cashierRole.id })
    mockRole.findById.mockResolvedValue(cashierRole)

    const role = await authorizationService.requirePermission(db, USER_A, STORE_A, "orders:create")
    expect(role.name).toBe("CASHIER")
  })
})

describe("isManagerOrOwner isolation", () => {
  it("OWNER at store A is NOT considered manager/owner at store B", async () => {
    mockMembership.findByUserAndStore.mockImplementation((_db: unknown, userId: string, storeId: string) => {
      if (userId === USER_A && storeId === STORE_A) return Promise.resolve(activeMembershipA)
      return Promise.resolve(null)
    })

    const resultAtA = await authorizationService.isManagerOrOwner(db, USER_A, STORE_A)
    const resultAtB = await authorizationService.isManagerOrOwner(db, USER_A, STORE_B)

    // Should be true at STORE_A where they have active OWNER membership
    // findByUserAndStore will need to be called twice — mock handles it per storeId
    // First call (STORE_A): mock returns activeMembershipA
    // We need roleRepo mock for the first call
    mockRole.findById.mockResolvedValue(ownerRole)

    // Re-run with role mock in place
    vi.clearAllMocks()
    mockMembership.findByUserAndStore.mockImplementation((_db: unknown, userId: string, storeId: string) => {
      if (userId === USER_A && storeId === STORE_A) return Promise.resolve(activeMembershipA)
      return Promise.resolve(null)
    })
    mockRole.findById.mockResolvedValue(ownerRole)

    expect(await authorizationService.isManagerOrOwner(db, USER_A, STORE_A)).toBe(true)
    expect(await authorizationService.isManagerOrOwner(db, USER_A, STORE_B)).toBe(false)
  })
})
