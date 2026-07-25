/**
 * iFood payment auto-registration tests
 *
 * Covers the two payment branches in ingestIfoodOrder:
 *  1. Prepaid (isPrepaid=true): payment and attempt created with PAID/CAPTURED status and payment.paid event published
 *  2. COD (isPrepaid=false): payment created with PENDING status and payment.created event published
 *  3. Idempotency: if the order already exists (findByExternalId returns a hit), registration is skipped entirely
 *
 * Also covers the COD auto-confirm-on-delivery branch in processIfoodEvents (CONCLUDED event):
 *  4. A PENDING payment is marked PAID when the marketplace confirms delivery
 *  5. Idempotency: a CONCLUDED event re-delivered by iFood must not re-capture an already-PAID payment
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/server/repositories", () => ({
  orderRepository: {
    findByExternalId: vi.fn(),
    findById: vi.fn(),
    getNextOrderNumber: vi.fn(),
    create: vi.fn(),
  },
  orderItemRepository: { createMany: vi.fn() },
  orderStatusTransitionRepository: { create: vi.fn() },
  marketplaceIntegrationRepository: {
    findByStoreAndType: vi.fn(),
    findByMerchantId: vi.fn().mockResolvedValue(null),
    findActiveByPlatform: vi.fn().mockResolvedValue([]),
    update: vi.fn(),
  },
  storeSettingsRepository: { findByStoreId: vi.fn() },
  paymentRepository: { create: vi.fn(), update: vi.fn(), findByOrderId: vi.fn() },
  paymentAttemptRepository: { create: vi.fn(), update: vi.fn(), findManyByOrder: vi.fn() },
  deliveryRepository: { create: vi.fn(), findByOrderId: vi.fn() },
  customerRepository: {
    findByStoreAndPhone: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    incrementTotalOrders: vi.fn(),
  },
}))

vi.mock("@/server/lib", () => ({
  eventBus: { publish: vi.fn(), on: vi.fn() },
  createEvent: vi.fn((type: string, storeId: string, _userId: null, payload: unknown) => ({ type, storeId, payload })),
  logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock("@/server/services/order.service", () => ({
  orderService: { confirmOrder: vi.fn(), create: vi.fn(), updateStatus: vi.fn() },
}))

vi.mock("@/server/services/delivery.service", () => ({
  deliveryService: { create: vi.fn(), updateStatus: vi.fn() },
}))

vi.mock("@/server/integrations/ifood", () => ({
  getIfoodAccessToken: vi.fn().mockResolvedValue("token"),
  fetchIfoodOrder: vi.fn().mockResolvedValue({ displayId: "ABC-001", merchant: { id: "merchant-1" } }),
  confirmIfoodOrder: vi.fn(),
  markIfoodOrderReadyToPickup: vi.fn(),
  dispatchIfoodOrder: vi.fn(),
  requestIfoodCancellation: vi.fn(),
  mapCancellationReason: vi.fn(),
  mapIfoodOrder: vi.fn(),
  setIfoodItemAvailability: vi.fn(),
  IfoodApiError: class IfoodApiError extends Error {},
  pollIfoodEvents: vi.fn(),
  acknowledgeIfoodEvents: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/server/db", () => ({
  prisma: { $transaction: vi.fn() },
  DbClient: {},
}))

vi.mock("@/server/lib/json", () => ({
  toJsonInput: vi.fn((v: unknown) => v),
  toNullableJsonInput: vi.fn((v: unknown) => v ?? null),
}))

import { prisma } from "@/server/db"
import { ifoodSyncService } from "@/server/services/ifood-sync.service"
import {
  paymentRepository,
  paymentAttemptRepository,
  orderRepository,
  marketplaceIntegrationRepository,
  deliveryRepository,
} from "@/server/repositories"
import { deliveryService } from "@/server/services/delivery.service"
import { eventBus } from "@/server/lib"
import { mapIfoodOrder } from "@/server/integrations/ifood"
import type { IfoodEvent } from "@/server/integrations/ifood"

const STORE_ID = "store-1"
const IFOOD_ORDER_ID = "ifood-order-1"
const CREATED_ORDER_ID = "order-created-1"

function buildMapped(isPrepaid: boolean) {
  return {
    externalId: IFOOD_ORDER_ID,
    type: "DELIVERY",
    channel: "IFOOD",
    itemsTotal: 50,
    discountTotal: 0,
    deliveryFee: 5,
    grandTotal: 55,
    notes: null,
    scheduledFor: null,
    deliveredBy: null,
    customerName: null,
    customerPhone: null,
    customerDocument: null,
    deliveryAddress: null,
    items: [],
    payment: { method: "CREDIT", isPrepaid },
  }
}

function setupTransaction(mapped: ReturnType<typeof buildMapped>) {
  const createdOrder = { id: CREATED_ORDER_ID, number: 1, grandTotal: 55, customerId: null, type: "DELIVERY", channel: "IFOOD" }
  ;(mapIfoodOrder as ReturnType<typeof vi.fn>).mockReturnValue(mapped)
  ;(orderRepository.findByExternalId as ReturnType<typeof vi.fn>).mockResolvedValue(null)
  ;(orderRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue({ id: CREATED_ORDER_ID, grandTotal: 55, customerId: null })
  ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
    ;(orderRepository.getNextOrderNumber as ReturnType<typeof vi.fn>).mockResolvedValueOnce(1)
    ;(orderRepository.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce(createdOrder)
    ;(orderRepository.orderItemRepository?.createMany as ReturnType<typeof vi.fn> | undefined)
    return fn(prisma)
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(paymentRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "payment-1" })
  ;(paymentAttemptRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "attempt-1" })
  ;(paymentRepository.update as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
  ;(paymentAttemptRepository.update as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
  ;(eventBus.publish as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
})

describe("ingestIfoodOrder – payment auto-registration", () => {
  it("idempotency: skips entire ingestion if order already exists", async () => {
    ;(orderRepository.findByExternalId as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "existing" })
    ;(mapIfoodOrder as ReturnType<typeof vi.fn>).mockReturnValue(buildMapped(true))

    await ifoodSyncService.ingestIfoodOrder(STORE_ID, IFOOD_ORDER_ID)

    expect(paymentRepository.create).not.toHaveBeenCalled()
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it("prepaid: creates PAID payment and publishes payment.paid event", async () => {
    setupTransaction(buildMapped(true))

    await ifoodSyncService.ingestIfoodOrder(STORE_ID, IFOOD_ORDER_ID)

    expect(paymentRepository.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ method: "CREDIT", gateway: "IFOOD", amount: 55 }),
    )
    expect(paymentAttemptRepository.update).toHaveBeenCalledWith(
      expect.anything(),
      "attempt-1",
      expect.objectContaining({ status: "CAPTURED" }),
    )
    expect(paymentRepository.update).toHaveBeenCalledWith(
      expect.anything(),
      "payment-1",
      expect.objectContaining({ status: "PAID" }),
    )
    const events = (eventBus.publish as ReturnType<typeof vi.fn>).mock.calls.map((c) => (c[0] as { type: string }).type)
    expect(events).toContain("payment.paid")
  })

  it("COD: creates PENDING payment and publishes payment.created (not payment.paid)", async () => {
    setupTransaction(buildMapped(false))

    await ifoodSyncService.ingestIfoodOrder(STORE_ID, IFOOD_ORDER_ID)

    expect(paymentRepository.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ method: "CREDIT", gateway: "IFOOD", amount: 55 }),
    )
    expect(paymentAttemptRepository.update).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ status: "CAPTURED" }),
    )
    expect(paymentRepository.update).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ status: "PAID" }),
    )
    const events = (eventBus.publish as ReturnType<typeof vi.fn>).mock.calls.map((c) => (c[0] as { type: string }).type)
    expect(events).toContain("payment.created")
    expect(events).not.toContain("payment.paid")
  })
})

describe("processIfoodEvents – COD payment confirmation on delivery (CONCLUDED)", () => {
  const MERCHANT_ID = "merchant-1"
  const ORDER_ID = "order-1"
  const DELIVERY_ID = "delivery-1"

  function buildConcludedEvent(): IfoodEvent {
    return {
      id: "event-1",
      fullCode: "CONCLUDED",
      orderId: IFOOD_ORDER_ID,
      merchantId: MERCHANT_ID,
    } as IfoodEvent
  }

  beforeEach(() => {
    ;(marketplaceIntegrationRepository.findByMerchantId as ReturnType<typeof vi.fn>).mockResolvedValue({
      storeId: STORE_ID,
      merchantId: MERCHANT_ID,
    })
    ;(orderRepository.findByExternalId as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: ORDER_ID,
      deliveredBy: "IFOOD",
      customerId: null,
    })
    ;(deliveryRepository.findByOrderId as ReturnType<typeof vi.fn>).mockResolvedValue({ id: DELIVERY_ID })
    ;(deliveryService.updateStatus as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
  })

  it("marks a PENDING COD payment PAID and publishes payment.paid", async () => {
    ;(paymentRepository.findByOrderId as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "payment-1",
      status: "PENDING",
      amount: 55,
      method: "CASH",
      gateway: "IFOOD",
    })
    ;(paymentAttemptRepository.findManyByOrder as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "attempt-1", status: "PENDING" },
    ])

    await ifoodSyncService.processIfoodEvents([buildConcludedEvent()])

    expect(paymentAttemptRepository.update).toHaveBeenCalledWith(
      expect.anything(),
      "attempt-1",
      expect.objectContaining({ status: "CAPTURED" }),
    )
    expect(paymentRepository.update).toHaveBeenCalledWith(
      expect.anything(),
      "payment-1",
      expect.objectContaining({ status: "PAID" }),
    )
    const events = (eventBus.publish as ReturnType<typeof vi.fn>).mock.calls.map((c) => (c[0] as { type: string }).type)
    expect(events).toContain("payment.paid")
  })

  it("idempotency: a redelivered CONCLUDED event does not re-capture an already-PAID payment", async () => {
    ;(paymentRepository.findByOrderId as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "payment-1",
      status: "PAID",
      amount: 55,
      method: "CASH",
      gateway: "IFOOD",
    })

    await ifoodSyncService.processIfoodEvents([buildConcludedEvent()])

    expect(paymentAttemptRepository.findManyByOrder).not.toHaveBeenCalled()
    expect(paymentAttemptRepository.update).not.toHaveBeenCalled()
    expect(paymentRepository.update).not.toHaveBeenCalled()
    const events = (eventBus.publish as ReturnType<typeof vi.fn>).mock.calls.map((c) => (c[0] as { type: string }).type)
    expect(events).not.toContain("payment.paid")
  })
})
