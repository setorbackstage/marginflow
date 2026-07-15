/**
 * Stock Movement Service Tests
 *
 * Covers the two most important contracts of stockMovementService.createManual:
 *
 *  1. Guard clauses — ingredient must exist, belong to the store, and not be
 *     soft-deleted; the resulting balance must never go negative (Business Rule 41).
 *
 *  2. signedDelta semantics — each ManualMovementType produces the correct sign
 *     and the quantity is rounded to 3 decimal places to absorb JS float noise.
 *
 *  3. Cost snapshot on ENTRY — costPerUnit is updated on the ingredient and also
 *     snapshotted into the movement row; non-ENTRY movements must not touch cost.
 *
 *  4. stock.low edge trigger (Business Rule 38 addendum) — published exactly
 *     once when the balance crosses from above minStock to at-or-below it, and
 *     NOT published when the balance was already below or when minStock is null.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/server/repositories", () => ({
  ingredientRepository: {
    findById: vi.fn(),
    update: vi.fn(),
    incrementStock: vi.fn(),
    findManyByIds: vi.fn(),
  },
  stockMovementRepository: {
    create: vi.fn(),
    findManyByOrder: vi.fn(),
    findManyByStore: vi.fn(),
    count: vi.fn(),
    sumCmv: vi.fn(),
    findConsumptionByIngredient: vi.fn(),
    maxCreatedAtByIngredient: vi.fn(),
  },
  recipeRepository: {
    findManyByProductIds: vi.fn(),
  },
}))

vi.mock("@/server/lib/events", () => ({
  // createEvent returns a minimal object whose `type` field we can assert on
  createEvent: vi.fn().mockImplementation((type: string) => ({ type })),
  eventBus: { publish: vi.fn(), on: vi.fn() },
}))

import { stockMovementService } from "@/server/services/stock-movement.service"
import { ingredientRepository, stockMovementRepository } from "@/server/repositories"
import { eventBus } from "@/server/lib/events"

const mockIngredientRepo = ingredientRepository as {
  findById: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  incrementStock: ReturnType<typeof vi.fn>
}
const mockMovementRepo = stockMovementRepository as {
  create: ReturnType<typeof vi.fn>
}
const mockEventBus = eventBus as { publish: ReturnType<typeof vi.fn> }

const db = {} as never
const storeId = "store-1"
const actorUserId = "user-actor"

/** Representative ingredient fixture — all fields that the service reads. */
const baseIngredient = {
  id: "ing-1",
  storeId,
  name: "Farinha",
  unit: "G",
  currentStock: 1000,
  minStock: 200,
  costPerUnit: 0.05,
  status: "ACTIVE",
  category: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const baseMovement = {
  id: "mov-1",
  storeId,
  ingredientId: "ing-1",
  type: "ENTRY",
  quantityDelta: 500,
  unitCost: 0.05,
  orderId: null,
  reason: null,
  createdByUserId: actorUserId,
  createdAt: new Date(),
}

beforeEach(() => {
  vi.clearAllMocks()
  mockMovementRepo.create.mockResolvedValue(baseMovement)
  mockIngredientRepo.incrementStock.mockResolvedValue(baseIngredient)
  mockEventBus.publish.mockResolvedValue(undefined)
})

// ─────────────────────────────────────────────────────────────────────────
// 1. Guard clauses
// ─────────────────────────────────────────────────────────────────────────

describe("stockMovementService.createManual — guard clauses", () => {
  it("throws INGREDIENT_NOT_FOUND when ingredient does not exist", async () => {
    mockIngredientRepo.findById.mockResolvedValue(null)
    await expect(
      stockMovementService.createManual(db, storeId, { ingredientId: "ing-1", type: "ENTRY", quantity: 100 }, actorUserId),
    ).rejects.toMatchObject({ code: "INGREDIENT_NOT_FOUND", status: 404 })
  })

  it("throws INGREDIENT_NOT_FOUND when ingredient belongs to a different store (tenant isolation)", async () => {
    mockIngredientRepo.findById.mockResolvedValue({ ...baseIngredient, storeId: "store-other" })
    await expect(
      stockMovementService.createManual(db, storeId, { ingredientId: "ing-1", type: "ENTRY", quantity: 100 }, actorUserId),
    ).rejects.toMatchObject({ code: "INGREDIENT_NOT_FOUND", status: 404 })
  })

  it("throws INGREDIENT_NOT_FOUND when ingredient is soft-deleted", async () => {
    mockIngredientRepo.findById.mockResolvedValue({ ...baseIngredient, deletedAt: new Date() })
    await expect(
      stockMovementService.createManual(db, storeId, { ingredientId: "ing-1", type: "ENTRY", quantity: 100 }, actorUserId),
    ).rejects.toMatchObject({ code: "INGREDIENT_NOT_FOUND", status: 404 })
  })

  it("throws INSUFFICIENT_STOCK (BR41) when EXIT would drive stock negative", async () => {
    mockIngredientRepo.findById.mockResolvedValue({ ...baseIngredient, currentStock: 100 })
    await expect(
      stockMovementService.createManual(db, storeId, { ingredientId: "ing-1", type: "EXIT", quantity: 200 }, actorUserId),
    ).rejects.toMatchObject({ code: "INSUFFICIENT_STOCK", status: 400 })
  })

  it("throws INSUFFICIENT_STOCK (BR41) when LOSS would drive stock negative", async () => {
    mockIngredientRepo.findById.mockResolvedValue({ ...baseIngredient, currentStock: 0 })
    await expect(
      stockMovementService.createManual(
        db,
        storeId,
        { ingredientId: "ing-1", type: "LOSS", quantity: 1, reason: "Vencimento" },
        actorUserId,
      ),
    ).rejects.toMatchObject({ code: "INSUFFICIENT_STOCK", status: 400 })
  })

  it("throws INSUFFICIENT_STOCK (BR41) when ADJUSTMENT DECREASE would drive stock negative", async () => {
    mockIngredientRepo.findById.mockResolvedValue({ ...baseIngredient, currentStock: 50 })
    await expect(
      stockMovementService.createManual(
        db,
        storeId,
        { ingredientId: "ing-1", type: "ADJUSTMENT", quantity: 100, direction: "DECREASE", reason: "Inventário" },
        actorUserId,
      ),
    ).rejects.toMatchObject({ code: "INSUFFICIENT_STOCK", status: 400 })
  })
})

// ─────────────────────────────────────────────────────────────────────────
// 2. signedDelta semantics per movement type
// ─────────────────────────────────────────────────────────────────────────

describe("stockMovementService.createManual — signedDelta per type", () => {
  it("ENTRY produces a positive delta", async () => {
    mockIngredientRepo.findById.mockResolvedValue(baseIngredient)
    await stockMovementService.createManual(
      db, storeId, { ingredientId: "ing-1", type: "ENTRY", quantity: 500 }, actorUserId,
    )
    expect(mockMovementRepo.create.mock.calls[0][1]).toMatchObject({ quantityDelta: 500 })
  })

  it("EXIT produces a negative delta", async () => {
    mockIngredientRepo.findById.mockResolvedValue(baseIngredient)
    await stockMovementService.createManual(
      db, storeId, { ingredientId: "ing-1", type: "EXIT", quantity: 300 }, actorUserId,
    )
    expect(mockMovementRepo.create.mock.calls[0][1]).toMatchObject({ quantityDelta: -300 })
  })

  it("LOSS produces a negative delta", async () => {
    mockIngredientRepo.findById.mockResolvedValue(baseIngredient)
    await stockMovementService.createManual(
      db,
      storeId,
      { ingredientId: "ing-1", type: "LOSS", quantity: 50, reason: "Vencimento" },
      actorUserId,
    )
    expect(mockMovementRepo.create.mock.calls[0][1]).toMatchObject({ quantityDelta: -50 })
  })

  it("ADJUSTMENT INCREASE produces a positive delta", async () => {
    mockIngredientRepo.findById.mockResolvedValue(baseIngredient)
    await stockMovementService.createManual(
      db,
      storeId,
      { ingredientId: "ing-1", type: "ADJUSTMENT", quantity: 100, direction: "INCREASE", reason: "Contagem" },
      actorUserId,
    )
    expect(mockMovementRepo.create.mock.calls[0][1]).toMatchObject({ quantityDelta: 100 })
  })

  it("ADJUSTMENT DECREASE produces a negative delta", async () => {
    mockIngredientRepo.findById.mockResolvedValue(baseIngredient)
    await stockMovementService.createManual(
      db,
      storeId,
      { ingredientId: "ing-1", type: "ADJUSTMENT", quantity: 100, direction: "DECREASE", reason: "Perda" },
      actorUserId,
    )
    expect(mockMovementRepo.create.mock.calls[0][1]).toMatchObject({ quantityDelta: -100 })
  })

  it("normalizes floating-point quantity to 3 decimal places (0.1+0.2 → 0.3)", async () => {
    mockIngredientRepo.findById.mockResolvedValue(baseIngredient)
    // 0.1 + 0.2 = 0.30000000000000004 in JS — round3 must produce exactly 0.3
    await stockMovementService.createManual(
      db,
      storeId,
      { ingredientId: "ing-1", type: "ENTRY", quantity: 0.1 + 0.2 },
      actorUserId,
    )
    expect(mockMovementRepo.create.mock.calls[0][1].quantityDelta).toBe(0.3)
  })
})

// ─────────────────────────────────────────────────────────────────────────
// 3. Cost snapshot on ENTRY
// ─────────────────────────────────────────────────────────────────────────

describe("stockMovementService.createManual — cost update", () => {
  it("updates ingredient costPerUnit and snapshots the new cost into the movement on ENTRY with costPerUnit", async () => {
    mockIngredientRepo.findById.mockResolvedValue(baseIngredient)
    mockIngredientRepo.update.mockResolvedValue({ ...baseIngredient, costPerUnit: 0.10 })

    await stockMovementService.createManual(
      db,
      storeId,
      { ingredientId: "ing-1", type: "ENTRY", quantity: 200, costPerUnit: 0.10 },
      actorUserId,
    )

    expect(mockIngredientRepo.update).toHaveBeenCalledWith(db, "ing-1", { costPerUnit: 0.10 })
    // The new cost must be snapshotted in the persisted movement row
    expect(mockMovementRepo.create.mock.calls[0][1]).toMatchObject({ unitCost: 0.10 })
  })

  it("does NOT update costPerUnit when ENTRY provides no costPerUnit", async () => {
    mockIngredientRepo.findById.mockResolvedValue(baseIngredient)
    await stockMovementService.createManual(
      db, storeId, { ingredientId: "ing-1", type: "ENTRY", quantity: 200 }, actorUserId,
    )
    expect(mockIngredientRepo.update).not.toHaveBeenCalled()
    // Falls back to ingredient's existing cost
    expect(mockMovementRepo.create.mock.calls[0][1]).toMatchObject({ unitCost: 0.05 })
  })

  it("does NOT update costPerUnit for EXIT movements even if costPerUnit is passed", async () => {
    mockIngredientRepo.findById.mockResolvedValue(baseIngredient)
    await stockMovementService.createManual(
      db, storeId, { ingredientId: "ing-1", type: "EXIT", quantity: 100, costPerUnit: 0.99 }, actorUserId,
    )
    expect(mockIngredientRepo.update).not.toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────────────
// 4. stock.low edge trigger
// ─────────────────────────────────────────────────────────────────────────

describe("stockMovementService.createManual — stock.low edge trigger", () => {
  it("publishes stock.low when balance crosses from above to at-or-below minStock", async () => {
    // before=250 > minStock=200; after=250-100=150 ≤ minStock → edge crossed
    mockIngredientRepo.findById.mockResolvedValue({ ...baseIngredient, currentStock: 250, minStock: 200 })

    await stockMovementService.createManual(
      db, storeId, { ingredientId: "ing-1", type: "EXIT", quantity: 100 }, actorUserId,
    )

    const publishedTypes = mockEventBus.publish.mock.calls.map((c) => (c[0] as { type: string }).type)
    expect(publishedTypes).toContain("stock.low")
  })

  it("does NOT publish stock.low when balance was already at or below minStock before the movement", async () => {
    // before=150 already ≤ minStock=200 — edge was already crossed; no new event
    mockIngredientRepo.findById.mockResolvedValue({ ...baseIngredient, currentStock: 150, minStock: 200 })

    await stockMovementService.createManual(
      db, storeId, { ingredientId: "ing-1", type: "EXIT", quantity: 10 }, actorUserId,
    )

    const publishedTypes = mockEventBus.publish.mock.calls.map((c) => (c[0] as { type: string }).type)
    expect(publishedTypes).not.toContain("stock.low")
  })

  it("does NOT publish stock.low when minStock is null (alert not configured)", async () => {
    mockIngredientRepo.findById.mockResolvedValue({ ...baseIngredient, currentStock: 100, minStock: null })

    await stockMovementService.createManual(
      db, storeId, { ingredientId: "ing-1", type: "EXIT", quantity: 90 }, actorUserId,
    )

    const publishedTypes = mockEventBus.publish.mock.calls.map((c) => (c[0] as { type: string }).type)
    expect(publishedTypes).not.toContain("stock.low")
  })

  it("always publishes stock.movement_created regardless of minStock state", async () => {
    mockIngredientRepo.findById.mockResolvedValue({ ...baseIngredient, currentStock: 1000, minStock: null })

    await stockMovementService.createManual(
      db, storeId, { ingredientId: "ing-1", type: "ENTRY", quantity: 100 }, actorUserId,
    )

    const publishedTypes = mockEventBus.publish.mock.calls.map((c) => (c[0] as { type: string }).type)
    expect(publishedTypes).toContain("stock.movement_created")
  })
})
