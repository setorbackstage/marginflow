import { describe, it, expect } from "vitest"
import { ALL_PERMISSIONS, BUILT_IN_ROLES } from "@/server/lib/permissions"

describe("ALL_PERMISSIONS", () => {
  it("contains no duplicates", () => {
    const unique = new Set(ALL_PERMISSIONS)
    expect(unique.size).toBe(ALL_PERMISSIONS.length)
  })

  it("every permission follows domain:action format", () => {
    for (const p of ALL_PERMISSIONS) {
      expect(p).toMatch(/^[a-z_]+:[a-z_]+$/)
    }
  })

  it("contains core permissions", () => {
    expect(ALL_PERMISSIONS).toContain("orders:create")
    expect(ALL_PERMISSIONS).toContain("products:edit")
    expect(ALL_PERMISSIONS).toContain("settings:view")
    expect(ALL_PERMISSIONS).toContain("settings:edit")
    expect(ALL_PERMISSIONS).toContain("users:invite")
    expect(ALL_PERMISSIONS).toContain("billing:manage")
    expect(ALL_PERMISSIONS).toContain("inventory:adjust")
    expect(ALL_PERMISSIONS).toContain("integrations:manage")
  })

  it("does NOT contain settings:manage (invalid permission)", () => {
    expect(ALL_PERMISSIONS).not.toContain("settings:manage")
  })
})

describe("BUILT_IN_ROLES", () => {
  it("defines exactly 6 built-in roles", () => {
    expect(BUILT_IN_ROLES).toHaveLength(6)
  })

  it("each role has name, displayName and non-empty permissions array", () => {
    for (const role of BUILT_IN_ROLES) {
      expect(role.name).toBeTruthy()
      expect(role.displayName).toBeTruthy()
      expect(role.permissions.length).toBeGreaterThan(0)
    }
  })

  it("every role permission exists in ALL_PERMISSIONS", () => {
    for (const role of BUILT_IN_ROLES) {
      for (const p of role.permissions) {
        expect(ALL_PERMISSIONS).toContain(p)
      }
    }
  })

  describe("OWNER", () => {
    const owner = BUILT_IN_ROLES.find((r) => r.name === "OWNER")!

    it("exists", () => expect(owner).toBeDefined())

    it("has all permissions", () => {
      expect(owner.permissions).toEqual(ALL_PERMISSIONS)
    })
  })

  describe("MANAGER", () => {
    const manager = BUILT_IN_ROLES.find((r) => r.name === "MANAGER")!

    it("exists", () => expect(manager).toBeDefined())

    it("does not have billing permissions", () => {
      const billing = manager.permissions.filter((p) => p.startsWith("billing:"))
      expect(billing).toHaveLength(0)
    })

    it("does not have users:remove", () => {
      expect(manager.permissions).not.toContain("users:remove")
    })

    it("has fewer permissions than OWNER", () => {
      const owner = BUILT_IN_ROLES.find((r) => r.name === "OWNER")!
      expect(manager.permissions.length).toBeLessThan(owner.permissions.length)
    })
  })

  describe("CASHIER", () => {
    const cashier = BUILT_IN_ROLES.find((r) => r.name === "CASHIER")!

    it("exists", () => expect(cashier).toBeDefined())

    it("can view and create orders", () => {
      expect(cashier.permissions).toContain("orders:view")
      expect(cashier.permissions).toContain("orders:create")
    })

    it("cannot access billing", () => {
      const billing = cashier.permissions.filter((p) => p.startsWith("billing:"))
      expect(billing).toHaveLength(0)
    })

    it("cannot access settings", () => {
      const settings = cashier.permissions.filter((p) => p.startsWith("settings:"))
      expect(settings).toHaveLength(0)
    })
  })

  describe("KITCHEN_ATTENDANT", () => {
    const kitchen = BUILT_IN_ROLES.find((r) => r.name === "KITCHEN_ATTENDANT")!

    it("exists", () => expect(kitchen).toBeDefined())

    it("can update kitchen status", () => {
      expect(kitchen.permissions).toContain("kitchen:view")
      expect(kitchen.permissions).toContain("kitchen:update_status")
    })

    it("can view orders", () => {
      expect(kitchen.permissions).toContain("orders:view")
    })

    it("cannot create orders", () => {
      expect(kitchen.permissions).not.toContain("orders:create")
    })
  })

  describe("DELIVERY_COORDINATOR", () => {
    const delivery = BUILT_IN_ROLES.find((r) => r.name === "DELIVERY_COORDINATOR")!

    it("exists", () => expect(delivery).toBeDefined())

    it("can assign courier and update status", () => {
      expect(delivery.permissions).toContain("delivery:assign_courier")
      expect(delivery.permissions).toContain("delivery:update_status")
    })

    it("can view orders but cannot cancel them", () => {
      expect(delivery.permissions).toContain("orders:view")
      expect(delivery.permissions).not.toContain("orders:cancel")
    })
  })

  describe("ANALYST", () => {
    const analyst = BUILT_IN_ROLES.find((r) => r.name === "ANALYST")!

    it("exists", () => expect(analyst).toBeDefined())

    it("can view reports and finance", () => {
      expect(analyst.permissions).toContain("reports:view")
      expect(analyst.permissions).toContain("reports:export")
      expect(analyst.permissions).toContain("finance:view")
    })

    it("cannot manage settings or users", () => {
      expect(analyst.permissions).not.toContain("settings:edit")
      expect(analyst.permissions).not.toContain("users:invite")
    })
  })
})
