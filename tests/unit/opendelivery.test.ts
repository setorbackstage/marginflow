import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Mocks (hoisted to avoid TDZ when referenced inside vi.mock factories) ──
const h = vi.hoisted(() => ({
  orderRepository: {
    findByExternalId: vi.fn(),
    getNextOrderNumber: vi.fn().mockResolvedValue(1),
    create: vi.fn(),
    findById: vi.fn(),
  },
  orderItemRepository: { createMany: vi.fn(), findManyByOrder: vi.fn().mockResolvedValue([]) },
  orderStatusTransitionRepository: { create: vi.fn() },
  marketplaceIntegrationRepository: { findByMerchantId: vi.fn() },
  customerRepository: { findByStoreAndPhone: vi.fn(), create: vi.fn(), update: vi.fn() },
  deliveryRepository: { findByOrderId: vi.fn() },
  paymentRepository: { findByOrderId: vi.fn() },
  paymentAttemptRepository: { findManyByOrder: vi.fn(), update: vi.fn() },
  orderService: { updateStatus: vi.fn() },
  deliveryService: { updateStatus: vi.fn() },
  eventBus: { publish: vi.fn() },
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  createEvent: vi.fn((type: string) => ({ type })),
  prisma: { $transaction: vi.fn((fn: (tx: unknown) => unknown) => fn({})) },
}))

vi.mock("@/server/repositories", () => ({
  orderRepository: h.orderRepository,
  orderItemRepository: h.orderItemRepository,
  orderStatusTransitionRepository: h.orderStatusTransitionRepository,
  marketplaceIntegrationRepository: h.marketplaceIntegrationRepository,
  customerRepository: h.customerRepository,
  deliveryRepository: h.deliveryRepository,
  paymentRepository: h.paymentRepository,
  paymentAttemptRepository: h.paymentAttemptRepository,
}))
vi.mock("@/server/services/order.service", () => ({ orderService: h.orderService }))
vi.mock("@/server/services/delivery.service", () => ({ deliveryService: h.deliveryService }))
vi.mock("@/server/lib", () => ({ eventBus: h.eventBus, createEvent: h.createEvent, logger: h.logger }))
vi.mock("@/server/db", () => ({ prisma: h.prisma }))

import {
  mapOpenDeliveryOrder,
  mapOdStatusToMf,
  mapMfStatusToOd,
  mapOdEventToMfStatus,
  isStatusProjectingEvent,
} from "@/server/integrations/opendelivery/mapper"
import { processOpenDeliveryEvents, ingestOpenDeliveryOrder } from "@/server/integrations/opendelivery/sync.service"
import type { OdOrder, OdOrderEvent } from "@/server/integrations/opendelivery/types"

const STORE_ID = "store-1"
const MERCHANT_ID = "app-123"

function makeOrder(overrides: Partial<OdOrder> = {}): OdOrder {
  return {
    id: "od-1",
    createdAt: "2026-08-06T12:00:00Z",
    fulfillment: { orderType: "DELIVERY" },
    status: "CREATED",
    items: [
      {
        name: "X-Burger",
        quantity: 2,
        unitPrice: 19.9,
        options: [{ name: "Extra queijo", priceAdjustment: 3.0 }],
      },
    ],
    total: { subtotal: 45.8, discounts: 5.0, deliveryFee: 4.0, grandTotal: 44.8 },
    payments: [{ method: "PIX", prepaid: true, amount: 44.8 }],
    customer: { name: "João", phone: "11999999999", document: "12345678900" },
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  h.marketplaceIntegrationRepository.findByMerchantId.mockResolvedValue({
    storeId: STORE_ID,
    merchantId: MERCHANT_ID,
  })
})

describe("Open Delivery v2 mapper", () => {
  it("maps DELIVERY order type and converts cents correctly", () => {
    const mapped = mapOpenDeliveryOrder(makeOrder())
    expect(mapped.type).toBe("DELIVERY")
    expect(mapped.itemsTotal).toBe(4580)
    expect(mapped.discountTotal).toBe(500)
    expect(mapped.deliveryFee).toBe(400)
    expect(mapped.grandTotal).toBe(4480)
    expect(mapped.items[0].productPrice).toBe(1990)
    expect(mapped.items[0].selectedModifiers[0].priceAdjustment).toBe(300)
  })

  it("maps TAKEOUT → TAKEAWAY and INDOOR → DINE_IN", () => {
    expect(mapOpenDeliveryOrder(makeOrder({ fulfillment: { orderType: "TAKEOUT" } })).type).toBe("TAKEAWAY")
    expect(mapOpenDeliveryOrder(makeOrder({ fulfillment: { orderType: "INDOOR" } })).type).toBe("DINE_IN")
  })

  it("status translation is bidirectional", () => {
    expect(mapOdStatusToMf("CREATED")).toBe("PENDING")
    expect(mapOdStatusToMf("IN_DELIVERY")).toBe("OUT_FOR_DELIVERY")
    expect(mapOdStatusToMf("CONCLUDED")).toBe("CONCLUDED")
    expect(mapMfStatusToOd("OUT_FOR_DELIVERY")).toBe("IN_DELIVERY")
    expect(mapMfStatusToOd("PENDING")).toBe("CREATED")
  })

  it("event→status: projecting events map, logistics/handshake do not", () => {
    expect(mapOdEventToMfStatus("CREATED")).toBe("PENDING")
    expect(mapOdEventToMfStatus("READY_FOR_PICKUP")).toBe("READY")
    expect(mapOdEventToMfStatus("DISPATCHED")).toBe("OUT_FOR_DELIVERY")
    expect(mapOdEventToMfStatus("RIDER_ARRIVED_AT_STORE")).toBeNull()
    expect(mapOdEventToMfStatus("CANCELLATION_REQUEST_ACCEPTED")).toBeNull()
    expect(mapOdEventToMfStatus("DELIVERY_ONGOING")).toBeNull()
    expect(isStatusProjectingEvent("CONFIRMED")).toBe(true)
    expect(isStatusProjectingEvent("ARRIVED_AT_CUSTOMER")).toBe(false)
  })
})

describe("processOpenDeliveryEvents", () => {
  it("ingests a CREATED event with full snapshot (idempotent)", async () => {
    h.orderRepository.findByExternalId.mockResolvedValue(null)
    h.orderRepository.create.mockResolvedValue({ id: "order-1", number: 1 })
    h.customerRepository.findByStoreAndPhone.mockResolvedValue(null)

    const created: OdOrderEvent = {
      eventId: "evt-1",
      eventType: "CREATED",
      orderId: "od-1",
      sourceAppId: MERCHANT_ID,
      createdAt: "2026-08-06T12:00:00Z",
      order: makeOrder(),
    }

    await processOpenDeliveryEvents([created])

    expect(h.orderRepository.create).toHaveBeenCalledTimes(1)
    expect(h.orderService.updateStatus).toHaveBeenCalledWith(
      expect.anything(),
      STORE_ID,
      "order-1",
      "CONFIRMED",
      expect.anything(),
    )
  })

  it("does not ingest again on duplicate CREATED (idempotency)", async () => {
    h.orderRepository.findByExternalId.mockResolvedValue({ id: "order-1", status: "CONFIRMED" })

    const created: OdOrderEvent = {
      eventId: "evt-2",
      eventType: "CREATED",
      orderId: "od-1",
      sourceAppId: MERCHANT_ID,
      order: makeOrder(),
    }
    await processOpenDeliveryEvents([created])
    expect(h.orderRepository.create).not.toHaveBeenCalled()
  })

  it("applies CONFIRMED/PREPARING via status-projecting events", async () => {
    h.orderRepository.findByExternalId.mockResolvedValue({ id: "order-1", status: "PENDING" })

    await processOpenDeliveryEvents([
      { eventId: "evt-3", eventType: "PREPARING", orderId: "od-1", sourceAppId: MERCHANT_ID },
    ])
    expect(h.orderService.updateStatus).toHaveBeenCalledWith(
      expect.anything(),
      STORE_ID,
      "order-1",
      "PREPARING",
      expect.anything(),
    )
  })

  it("logistics/informational events do NOT change authoritative status", async () => {
    h.orderRepository.findByExternalId.mockResolvedValue({
      id: "order-1",
      status: "PREPARING",
      deliveredBy: "MARKETPLACE",
    })

    await processOpenDeliveryEvents([
      { eventId: "evt-4", eventType: "RIDER_ARRIVED_AT_STORE", orderId: "od-1", sourceAppId: MERCHANT_ID },
      { eventId: "evt-5", eventType: "DELIVERY_ONGOING", orderId: "od-1", sourceAppId: MERCHANT_ID },
    ])
    expect(h.orderService.updateStatus).not.toHaveBeenCalled()
  })

  it("cancels on CANCELLED event", async () => {
    h.orderRepository.findByExternalId.mockResolvedValue({
      id: "order-1",
      status: "CONFIRMED",
      deliveredBy: "MARKETPLACE",
    })

    await processOpenDeliveryEvents([
      { eventId: "evt-6", eventType: "CANCELLED", orderId: "od-1", sourceAppId: MERCHANT_ID },
    ])
    expect(h.orderService.updateStatus).toHaveBeenCalledWith(
      expect.anything(),
      STORE_ID,
      "order-1",
      "CANCELLED",
      expect.anything(),
    )
  })

  it("ignores unknown merchant", async () => {
    h.marketplaceIntegrationRepository.findByMerchantId.mockResolvedValue(null)
    await processOpenDeliveryEvents([
      { eventId: "evt-7", eventType: "CONFIRMED", orderId: "od-1", sourceAppId: "unknown" },
    ])
    expect(h.orderService.updateStatus).not.toHaveBeenCalled()
  })
})

describe("ingestOpenDeliveryOrder", () => {
  it("skips when order already exists", async () => {
    h.orderRepository.findByExternalId.mockResolvedValue({ id: "order-1" })
    await ingestOpenDeliveryOrder(STORE_ID, makeOrder())
    expect(h.orderRepository.create).not.toHaveBeenCalled()
  })
})
