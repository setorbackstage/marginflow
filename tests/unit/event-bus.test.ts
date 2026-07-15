import { describe, it, expect, vi, beforeEach } from "vitest"

// EventBus uses logger — mock it to keep output clean
vi.mock("@/server/lib/logger", () => ({
  logger: { debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

// Import class by re-importing the module fresh each test
let eventBusModule: typeof import("@/server/lib/events/bus")

beforeEach(async () => {
  vi.resetModules()
  // Clear globalThis.eventBus so each test gets a fresh instance
  const g = globalThis as { eventBus?: unknown }
  delete g.eventBus
  eventBusModule = await import("@/server/lib/events/bus")
})

const db = {} as never

describe("EventBus.on + publish", () => {
  it("calls a registered listener when the event type matches", async () => {
    const { eventBus } = eventBusModule
    const listener = vi.fn().mockResolvedValue(undefined)
    eventBus.on("order.created", "test:order.created", listener)

    const event = {
      eventId: "evt-1",
      eventType: "order.created" as const,
      occurredAt: new Date().toISOString(),
      storeId: "store-1",
      triggeredByUserId: null,
      payload: { orderId: "o-1", orderNumber: 1, type: "DINE_IN", channel: "POS", customerId: null, grandTotal: 100, itemCount: 2 },
    }

    await eventBus.publish(event, db)
    expect(listener).toHaveBeenCalledOnce()
    expect(listener).toHaveBeenCalledWith(event, db)
  })

  it("does NOT call listeners registered for a different event type", async () => {
    const { eventBus } = eventBusModule
    const wrongListener = vi.fn().mockResolvedValue(undefined)
    eventBus.on("order.cancelled", "test:order.cancelled", wrongListener)

    const event = {
      eventId: "evt-2",
      eventType: "order.confirmed" as const,
      occurredAt: new Date().toISOString(),
      storeId: "store-1",
      triggeredByUserId: null,
      payload: { orderId: "o-1", orderNumber: 1, type: "DINE_IN", items: [], orderNotes: null, confirmedAt: new Date().toISOString() },
    }

    await eventBus.publish(event, db)
    expect(wrongListener).not.toHaveBeenCalled()
  })

  it("calls multiple listeners for the same event type in registration order", async () => {
    const { eventBus } = eventBusModule
    const callOrder: string[] = []
    const l1 = vi.fn().mockImplementation(async () => { callOrder.push("first") })
    const l2 = vi.fn().mockImplementation(async () => { callOrder.push("second") })

    eventBus.on("order.created", "test:l1", l1)
    eventBus.on("order.created", "test:l2", l2)

    const event = {
      eventId: "evt-3",
      eventType: "order.created" as const,
      occurredAt: new Date().toISOString(),
      storeId: "store-1",
      triggeredByUserId: null,
      payload: { orderId: "o-1", orderNumber: 1, type: "DINE_IN", channel: "POS", customerId: null, grandTotal: 50, itemCount: 1 },
    }

    await eventBus.publish(event, db)
    expect(callOrder).toEqual(["first", "second"])
  })

  it("replaces an existing listener when the same key is registered again (dedup)", async () => {
    const { eventBus } = eventBusModule
    const first = vi.fn().mockResolvedValue(undefined)
    const replacement = vi.fn().mockResolvedValue(undefined)

    eventBus.on("order.created", "unique-key", first)
    eventBus.on("order.created", "unique-key", replacement)

    const event = {
      eventId: "evt-4",
      eventType: "order.created" as const,
      occurredAt: new Date().toISOString(),
      storeId: "store-1",
      triggeredByUserId: null,
      payload: { orderId: "o-1", orderNumber: 1, type: "DINE_IN", channel: "POS", customerId: null, grandTotal: 50, itemCount: 1 },
    }

    await eventBus.publish(event, db)
    expect(first).not.toHaveBeenCalled()
    expect(replacement).toHaveBeenCalledOnce()
  })

  it("propagates a listener error (aborting remaining listeners)", async () => {
    const { eventBus } = eventBusModule
    const failing = vi.fn().mockRejectedValue(new Error("listener failed"))
    const afterFailing = vi.fn().mockResolvedValue(undefined)

    eventBus.on("order.created", "test:failing", failing)
    eventBus.on("order.created", "test:after", afterFailing)

    const event = {
      eventId: "evt-5",
      eventType: "order.created" as const,
      occurredAt: new Date().toISOString(),
      storeId: "store-1",
      triggeredByUserId: null,
      payload: { orderId: "o-1", orderNumber: 1, type: "DINE_IN", channel: "POS", customerId: null, grandTotal: 50, itemCount: 1 },
    }

    await expect(eventBus.publish(event, db)).rejects.toThrow("listener failed")
    expect(afterFailing).not.toHaveBeenCalled()
  })

  it("passes the db client reference through to every listener", async () => {
    const { eventBus } = eventBusModule
    const receivedDb: unknown[] = []
    const listener = vi.fn().mockImplementation(async (_evt: unknown, d: unknown) => { receivedDb.push(d) })
    eventBus.on("order.created", "test:db-check", listener)

    const fakeDb = { id: "tx-client" } as never
    const event = {
      eventId: "evt-6",
      eventType: "order.created" as const,
      occurredAt: new Date().toISOString(),
      storeId: "store-1",
      triggeredByUserId: null,
      payload: { orderId: "o-1", orderNumber: 1, type: "DINE_IN", channel: "POS", customerId: null, grandTotal: 50, itemCount: 1 },
    }

    await eventBus.publish(event, fakeDb)
    expect(receivedDb[0]).toBe(fakeDb)
  })
})

describe("createEvent", () => {
  it("builds a correctly shaped event envelope", () => {
    const { createEvent } = eventBusModule
    const payload = { orderId: "o-1", orderNumber: 1, type: "DINE_IN", channel: "POS", customerId: null, grandTotal: 100, itemCount: 2 }
    const event = createEvent("order.created", "store-1", "user-1", payload)

    expect(event.eventType).toBe("order.created")
    expect(event.storeId).toBe("store-1")
    expect(event.triggeredByUserId).toBe("user-1")
    expect(event.payload).toEqual(payload)
    expect(event.eventId).toMatch(/^[0-9a-f-]{36}$/) // UUID v4 format
    expect(new Date(event.occurredAt).getTime()).toBeGreaterThan(0)
  })

  it("accepts null triggeredByUserId", () => {
    const { createEvent } = eventBusModule
    const event = createEvent("order.created", "store-1", null, {
      orderId: "o-1", orderNumber: 1, type: "DINE_IN", channel: "POS", customerId: null, grandTotal: 0, itemCount: 0,
    })
    expect(event.triggeredByUserId).toBeNull()
  })

  it("generates unique eventIds for each call", () => {
    const { createEvent } = eventBusModule
    const payload = { orderId: "o-1", orderNumber: 1, type: "DINE_IN", channel: "POS", customerId: null, grandTotal: 0, itemCount: 0 }
    const e1 = createEvent("order.created", "store-1", null, payload)
    const e2 = createEvent("order.created", "store-1", null, payload)
    expect(e1.eventId).not.toBe(e2.eventId)
  })
})
