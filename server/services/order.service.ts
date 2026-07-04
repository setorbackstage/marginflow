import "server-only"
import type { DbClient } from "../db"
import type { Order, OrderItem, Prisma } from "../../generated/prisma/client"
import {
  orderRepository,
  orderItemRepository,
  orderStatusTransitionRepository,
  productRepository,
  modifierRepository,
  modifierGroupRepository,
  customerRepository,
  addressRepository,
  storeRepository,
  storeSettingsRepository,
} from "../repositories"
import { BadRequestError, ConflictError, NotFoundError } from "../lib/errors"
import { eventBus, createEvent } from "../lib/events"
import { toJsonInput, toNullableJsonInput } from "../lib/json"

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────

export interface SelectedModifierInput {
  modifierId: string
  modifierGroupId: string
}

export interface CreateOrderItemInput {
  productId: string
  quantity: number
  selectedModifiers?: SelectedModifierInput[]
  notes?: string | null
}

export interface CreateOrderInput {
  type: string
  channel: string
  customerId?: string | null
  deliveryAddressId?: string | null
  tableNumber?: string | null
  notes?: string | null
  scheduledFor?: string | null
  items: CreateOrderItemInput[]
}

export interface UpdateOrderInput {
  notes?: string | null
  scheduledFor?: string | null
  tableNumber?: string | null
  deliveryAddressId?: string | null
}

export interface UpdateOrderItemInput {
  quantity?: number
  notes?: string | null
}

export interface UpdateOrderStatusOptions {
  reason?: string
  notes?: string | null
  triggeredByUserId: string | null
  /** Controller-resolved RBAC decision — see events/types.ts `OrderCancelledPayload`. */
  isManagerApproved?: boolean
}

const EDITABLE_STATUSES = ["DRAFT", "PENDING"]

/** Transitions this endpoint (`POST /orders/:orderId/status`) itself accepts — PREPARING/READY/OUT_FOR_DELIVERY are system-derived only. */
const CLIENT_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["PENDING"],
  PENDING: ["CONFIRMED"],
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

async function getOrderOrThrow(db: DbClient, id: string): Promise<Order> {
  const order = await orderRepository.findById(db, id)
  if (!order) throw new NotFoundError("ORDER_NOT_FOUND", "Order does not exist in this store.")
  return order
}

/**
 * Store Isolation (API_SPEC.md) for every mutation this service owns
 * (`update`, `addItem`, `updateItem`, `removeItem`, `updateStatus`) — kept
 * separate from `getById` (unchecked) because Payments' and Deliveries'
 * routes already call `getById` with an `order.orderId` that was already
 * verified store-scoped via the Payment/Delivery record itself; changing
 * that call site is out of scope here.
 */
async function getOrderInStoreOrThrow(db: DbClient, storeId: string, id: string): Promise<Order> {
  const order = await getOrderOrThrow(db, id)
  if (order.storeId !== storeId) throw new NotFoundError("ORDER_NOT_FOUND", "Order does not exist in this store.")
  return order
}

function assertEditable(order: Order): void {
  if (!EDITABLE_STATUSES.includes(order.status)) {
    throw new ConflictError("ORDER_NOT_EDITABLE", "Order is not in DRAFT or PENDING status.")
  }
}

interface ResolvedModifier {
  modifierId: string
  modifierGroupId: string
  name: string
  priceAdjustment: number
}

/** Business Rules 11-14: snapshot modifier data and enforce each group's min/max selection rules. */
async function resolveItemModifiers(
  db: DbClient,
  productId: string,
  selected: SelectedModifierInput[],
): Promise<ResolvedModifier[]> {
  const groups = await modifierGroupRepository.findManyByProduct(db, productId)
  const resolved: ResolvedModifier[] = []

  for (const group of groups) {
    const selectedForGroup = selected.filter((s) => s.modifierGroupId === group.id)

    if (group.isRequired && selectedForGroup.length < group.minSelections) {
      throw new BadRequestError(
        "MODIFIER_VALIDATION_FAILED",
        `Modifier group "${group.name}" requires at least ${group.minSelections} selection(s).`,
      )
    }
    if (selectedForGroup.length > group.maxSelections) {
      throw new BadRequestError(
        "MODIFIER_VALIDATION_FAILED",
        `Modifier group "${group.name}" allows at most ${group.maxSelections} selection(s).`,
      )
    }

    for (const selection of selectedForGroup) {
      const modifier = await modifierRepository.findById(db, selection.modifierId)
      if (!modifier || modifier.modifierGroupId !== group.id || modifier.deletedAt) {
        throw new BadRequestError("MODIFIER_VALIDATION_FAILED", "A selected modifier is invalid for this product.")
      }
      resolved.push({
        modifierId: modifier.id,
        modifierGroupId: group.id,
        name: modifier.name,
        priceAdjustment: modifier.priceAdjustment,
      })
    }
  }

  return resolved
}

interface PricedItem {
  productId: string
  productName: string
  productPrice: number
  quantity: number
  selectedModifiers: ResolvedModifier[]
  unitTotal: number
  subtotal: number
  notes: string | null
}

/** Business Rules 11-12, 28, 30: snapshot product data; reject unavailable products. */
async function priceItem(db: DbClient, storeId: string, input: CreateOrderItemInput): Promise<PricedItem> {
  const product = await productRepository.findById(db, input.productId)
  if (!product || product.storeId !== storeId || product.deletedAt) {
    throw new BadRequestError("PRODUCT_NOT_FOUND", "A product ID does not belong to this store.")
  }
  if (product.status !== "ACTIVE") {
    throw new BadRequestError("PRODUCT_NOT_AVAILABLE", "A product is OUT_OF_STOCK or INACTIVE.")
  }

  const selectedModifiers = await resolveItemModifiers(db, product.id, input.selectedModifiers ?? [])
  const modifierTotal = selectedModifiers.reduce((sum, m) => sum + m.priceAdjustment, 0)
  const unitTotal = product.price + modifierTotal
  const subtotal = unitTotal * input.quantity

  return {
    productId: product.id,
    productName: product.name,
    productPrice: product.price,
    quantity: input.quantity,
    selectedModifiers,
    unitTotal,
    subtotal,
    notes: input.notes ?? null,
  }
}

interface AddressSnapshot {
  street: string
  number: string
  complement: string | null
  neighborhood: string
  city: string
  state: string
  postalCode: string
  country: string
  latitude: number | null
  longitude: number | null
}

function snapshotAddress(address: {
  street: string
  number: string
  complement: string | null
  neighborhood: string
  city: string
  state: string
  postalCode: string
  country: string
  latitude: Prisma.Decimal | null
  longitude: Prisma.Decimal | null
}): AddressSnapshot {
  return {
    street: address.street,
    number: address.number,
    complement: address.complement,
    neighborhood: address.neighborhood,
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    country: address.country,
    latitude: address.latitude ? Number(address.latitude) : null,
    longitude: address.longitude ? Number(address.longitude) : null,
  }
}

async function recomputeTotals(db: DbClient, order: Order): Promise<Order> {
  const items = await orderItemRepository.findManyByOrder(db, order.id)
  const itemsTotal = items.reduce((sum, item) => sum + item.subtotal, 0)
  const grandTotal = itemsTotal - order.discountTotal + order.deliveryFee
  return orderRepository.update(db, order.id, { itemsTotal, grandTotal })
}

async function recordTransition(
  db: DbClient,
  orderId: string,
  status: string,
  triggeredByUserId: string | null,
  notes?: string | null,
): Promise<void> {
  await orderStatusTransitionRepository.create(db, {
    order: { connect: { id: orderId } },
    status,
    triggeredByUser: triggeredByUserId ? { connect: { id: triggeredByUserId } } : undefined,
    notes: notes ?? null,
  })
}

// ─────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────

export const orderService = {
  getById: getOrderOrThrow,
  findByIdWithDetails: orderRepository.findByIdWithDetails,
  listByStore: orderRepository.findManyByStore,
  count: orderRepository.count,
  getTimeline: orderStatusTransitionRepository.findManyByOrder,
  listItems: orderItemRepository.findManyByOrder,

  /**
   * `POST /orders`. Generates the order number via an advisory lock — the
   * caller MUST invoke this within `prisma.$transaction` (see
   * `orderRepository.getNextOrderNumber`).
   */
  async create(db: DbClient, storeId: string, input: CreateOrderInput, createdByUserId: string | null): Promise<Order> {
    if (input.items.length === 0) {
      throw new BadRequestError("VALIDATION_ERROR", "Must contain at least 1 item.")
    }

    if (input.customerId) {
      const customer = await customerRepository.findById(db, input.customerId)
      if (!customer || customer.storeId !== storeId) {
        throw new BadRequestError("CUSTOMER_NOT_FOUND", "Customer does not belong to this store.")
      }
      if (customer.status === "BLOCKED") {
        throw new BadRequestError("CUSTOMER_BLOCKED", "The specified customer has status BLOCKED.")
      }
    }

    let deliveryAddress: AddressSnapshot | null = null
    if (input.type === "DELIVERY") {
      if (!input.deliveryAddressId) {
        throw new BadRequestError("DELIVERY_ADDRESS_REQUIRED", "type = DELIVERY but no address provided.")
      }
      const address = await addressRepository.findById(db, input.deliveryAddressId)
      if (!address || address.customerId !== input.customerId || address.deletedAt) {
        throw new BadRequestError("ADDRESS_NOT_FOUND", "The delivery address does not belong to the customer.")
      }
      deliveryAddress = snapshotAddress(address)
    }

    if (input.scheduledFor) {
      const settings = await storeSettingsRepository.findByStoreId(db, storeId)
      if (!settings?.allowScheduledOrders) {
        throw new BadRequestError("SCHEDULED_ORDERS_DISABLED", "scheduledFor provided but store setting is off.")
      }
      const maxDate = new Date()
      maxDate.setDate(maxDate.getDate() + settings.maxScheduledDaysAhead)
      if (new Date(input.scheduledFor) > maxDate) {
        throw new BadRequestError("SCHEDULED_TOO_FAR", "scheduledFor exceeds max_scheduled_days_ahead.")
      }
    }

    const pricedItems = await Promise.all(input.items.map((item) => priceItem(db, storeId, item)))
    const itemsTotal = pricedItems.reduce((sum, item) => sum + item.subtotal, 0)
    const store = await storeRepository.findById(db, storeId)
    const deliveryFee = input.type === "DELIVERY" ? (store?.deliveryFee ?? 0) : 0
    const discountTotal = 0
    const grandTotal = itemsTotal - discountTotal + deliveryFee

    const number = await orderRepository.getNextOrderNumber(db, storeId)

    const order = await orderRepository.create(db, {
      store: { connect: { id: storeId } },
      customer: input.customerId ? { connect: { id: input.customerId } } : undefined,
      number,
      type: input.type,
      channel: input.channel,
      tableNumber: input.tableNumber ?? null,
      deliveryAddress: toNullableJsonInput(deliveryAddress),
      notes: input.notes ?? null,
      scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : null,
      itemsTotal,
      discountTotal,
      deliveryFee,
      grandTotal,
    })

    await orderItemRepository.createMany(
      db,
      pricedItems.map((item) => ({
        orderId: order.id,
        productId: item.productId,
        productName: item.productName,
        productPrice: item.productPrice,
        quantity: item.quantity,
        selectedModifiers: toJsonInput(item.selectedModifiers),
        unitTotal: item.unitTotal,
        subtotal: item.subtotal,
        notes: item.notes,
      })),
    )

    await recordTransition(db, order.id, "DRAFT", createdByUserId)

    await eventBus.publish(
      createEvent("order.created", storeId, createdByUserId, {
        orderId: order.id,
        orderNumber: order.number,
        type: order.type,
        channel: order.channel,
        customerId: order.customerId,
        grandTotal: order.grandTotal,
        itemCount: pricedItems.length,
      }),
      db,
    )

    return order
  },

  /** `PATCH /orders/:orderId` — only while DRAFT or PENDING. */
  async update(db: DbClient, storeId: string, orderId: string, input: UpdateOrderInput): Promise<Order> {
    const order = await getOrderInStoreOrThrow(db, storeId, orderId)
    assertEditable(order)

    let deliveryAddress: AddressSnapshot | undefined
    if (input.deliveryAddressId && order.type === "DELIVERY") {
      const address = await addressRepository.findById(db, input.deliveryAddressId)
      if (!address || address.customerId !== order.customerId || address.deletedAt) {
        throw new BadRequestError("ADDRESS_NOT_FOUND", "The delivery address does not belong to the customer.")
      }
      deliveryAddress = snapshotAddress(address)
    }

    // Note: API_SPEC.md lists "Events Produced: order.updated" for this endpoint, but
    // order.updated has no entry in the Event Contracts catalog (no payload schema, no
    // consumers) — unlike order.created/confirmed/ready/etc. Emitting an event with an
    // invented payload would be exactly the kind of undocumented behavior this phase must
    // not introduce, so this method does not publish one. Flagged for follow-up once
    // API_SPEC.md defines order.updated's contract.
    return orderRepository.update(db, orderId, {
      notes: input.notes,
      tableNumber: input.tableNumber,
      scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : input.scheduledFor,
      ...(deliveryAddress ? { deliveryAddress: toJsonInput(deliveryAddress) } : {}),
    })
  },

  /** `POST /orders/:orderId/items` — only while DRAFT or PENDING. */
  async addItem(db: DbClient, storeId: string, orderId: string, input: CreateOrderItemInput): Promise<OrderItem> {
    const order = await getOrderInStoreOrThrow(db, storeId, orderId)
    assertEditable(order)

    const priced = await priceItem(db, storeId, input)
    const item = await orderItemRepository.create(db, {
      order: { connect: { id: orderId } },
      product: { connect: { id: priced.productId } },
      productName: priced.productName,
      productPrice: priced.productPrice,
      quantity: priced.quantity,
      selectedModifiers: toJsonInput(priced.selectedModifiers),
      unitTotal: priced.unitTotal,
      subtotal: priced.subtotal,
      notes: priced.notes,
    })

    await recomputeTotals(db, order)
    return item
  },

  /** `PATCH /orders/:orderId/items/:itemId` — only while DRAFT or PENDING. */
  async updateItem(db: DbClient, storeId: string, orderId: string, itemId: string, input: UpdateOrderItemInput): Promise<OrderItem> {
    const order = await getOrderInStoreOrThrow(db, storeId, orderId)
    assertEditable(order)

    const item = await orderItemRepository.findById(db, itemId)
    if (!item || item.orderId !== orderId) {
      throw new NotFoundError("ITEM_NOT_FOUND", "Item does not belong to this order.")
    }

    const quantity = input.quantity ?? item.quantity
    const subtotal = item.unitTotal * quantity
    const updated = await orderItemRepository.update(db, itemId, { quantity, notes: input.notes, subtotal })

    await recomputeTotals(db, order)
    return updated
  },

  /** `DELETE /orders/:orderId/items/:itemId` — only while DRAFT or PENDING; the last item cannot be removed. */
  async removeItem(db: DbClient, storeId: string, orderId: string, itemId: string): Promise<void> {
    const order = await getOrderInStoreOrThrow(db, storeId, orderId)
    assertEditable(order)

    const item = await orderItemRepository.findById(db, itemId)
    if (!item || item.orderId !== orderId) {
      throw new NotFoundError("ITEM_NOT_FOUND", "Item does not belong to this order.")
    }

    const itemCount = await orderItemRepository.count(db, orderId)
    if (itemCount <= 1) {
      throw new ConflictError("CANNOT_REMOVE_LAST_ITEM", "Removing this item would leave the order empty.")
    }

    await orderItemRepository.remove(db, itemId)
    await recomputeTotals(db, order)
  },

  /**
   * `POST /orders/:orderId/status`. Only accepts the transitions this
   * endpoint owns (DRAFT→PENDING, PENDING→CONFIRMED, READY→DELIVERED for
   * TAKEAWAY, any→CANCELLED). PREPARING/READY/OUT_FOR_DELIVERY are
   * system-derived — see the event listeners registered below. For
   * CONFIRMED and CANCELLED, side effects (Kitchen Ticket creation, Kitchen
   * Ticket/Delivery cancellation) run inside `eventBus.publish` — the
   * caller MUST invoke this within `prisma.$transaction` for the
   * "exactly-once within the transaction" guarantee API_SPEC.md documents.
   */
  async updateStatus(db: DbClient, storeId: string, orderId: string, target: string, opts: UpdateOrderStatusOptions): Promise<Order> {
    const order = await getOrderInStoreOrThrow(db, storeId, orderId)

    if (target === "CANCELLED") return cancelOrder(db, storeId, order, opts)
    if (target === "DELIVERED") return deliverTakeawayOrder(db, storeId, order, opts)

    const allowed = CLIENT_TRANSITIONS[order.status] ?? []
    if (!allowed.includes(target)) {
      if (order.status === "DELIVERED") throw new ConflictError("ORDER_ALREADY_DELIVERED", "Cannot transition a delivered order.")
      if (order.status === "CANCELLED") throw new ConflictError("ORDER_ALREADY_CANCELLED", "Cannot transition a cancelled order.")
      throw new BadRequestError("INVALID_TRANSITION", "The requested transition is not allowed.")
    }

    if (target === "PENDING") return submitOrder(db, storeId, order, opts)
    return confirmOrder(db, storeId, order, opts)
  },
}

async function submitOrder(db: DbClient, storeId: string, order: Order, opts: UpdateOrderStatusOptions): Promise<Order> {
  const updated = await orderRepository.update(db, order.id, { status: "PENDING" })
  await recordTransition(db, order.id, "PENDING", opts.triggeredByUserId, opts.notes)

  const settings = await storeSettingsRepository.findByStoreId(db, storeId)
  // Business Rule 9: a scheduled order stays PENDING until its scheduled time opens —
  // auto-confirm must not fire early. The direct client-facing endpoint (confirmOrder
  // called explicitly) still rejects an early attempt below.
  const scheduledTimeReached = !updated.scheduledFor || new Date() >= updated.scheduledFor
  if (settings?.autoConfirmOrders && scheduledTimeReached) {
    return confirmOrder(db, storeId, updated, { triggeredByUserId: null, notes: "Auto-confirmado pelo sistema" })
  }
  return updated
}

async function confirmOrder(db: DbClient, storeId: string, order: Order, opts: UpdateOrderStatusOptions): Promise<Order> {
  if (order.scheduledFor && new Date() < order.scheduledFor) {
    throw new BadRequestError("SCHEDULED_TIME_NOT_REACHED", "Scheduled orders cannot be confirmed before their scheduled time.")
  }

  const confirmedAt = new Date()
  const updated = await orderRepository.update(db, order.id, {
    status: "CONFIRMED",
    confirmedAt: order.confirmedAt ?? confirmedAt,
  })
  await recordTransition(db, order.id, "CONFIRMED", opts.triggeredByUserId, opts.notes)

  const items = await orderItemRepository.findManyByOrder(db, order.id)
  await eventBus.publish(
    createEvent("order.confirmed", storeId, opts.triggeredByUserId, {
      orderId: order.id,
      orderNumber: order.number,
      type: order.type,
      items: items.map((item) => ({
        orderItemId: item.id,
        productName: item.productName,
        quantity: item.quantity,
        modifierSummary: Array.isArray(item.selectedModifiers)
          ? (item.selectedModifiers as unknown as { name: string }[]).map((m) => m.name)
          : [],
        notes: item.notes,
      })),
      orderNotes: order.notes,
      confirmedAt: confirmedAt.toISOString(),
    }),
    db,
  )

  return updated
}

async function deliverTakeawayOrder(db: DbClient, storeId: string, order: Order, opts: UpdateOrderStatusOptions): Promise<Order> {
  if (order.status !== "READY" || order.type !== "TAKEAWAY") {
    throw new BadRequestError("INVALID_TRANSITION", "The requested transition is not allowed.")
  }

  const deliveredAt = new Date()
  const updated = await orderRepository.update(db, order.id, {
    status: "DELIVERED",
    deliveredAt: order.deliveredAt ?? deliveredAt,
  })
  await recordTransition(db, order.id, "DELIVERED", opts.triggeredByUserId, opts.notes)

  await eventBus.publish(
    createEvent("order.delivered", storeId, opts.triggeredByUserId, {
      orderId: order.id,
      orderNumber: order.number,
      customerId: order.customerId,
      grandTotal: order.grandTotal,
      type: order.type,
      deliveredAt: deliveredAt.toISOString(),
    }),
    db,
  )

  return updated
}

async function cancelOrder(db: DbClient, storeId: string, order: Order, opts: UpdateOrderStatusOptions): Promise<Order> {
  if (order.status === "DELIVERED") throw new ConflictError("ORDER_ALREADY_DELIVERED", "Cannot transition a delivered order.")
  if (order.status === "CANCELLED") throw new ConflictError("ORDER_ALREADY_CANCELLED", "Cannot transition a cancelled order.")
  if (!opts.reason) throw new BadRequestError("CANCELLATION_REASON_REQUIRED", "Cancelling requires a reason.")
  // Business Rule 4: "Anonymous cancellations are not permitted." Unlike PREPARING/READY/
  // OUT_FOR_DELIVERY/DELIVERED (system-derived, triggeredByUserId legitimately null),
  // CANCELLED is always either a client-initiated call (must carry a real user) or the
  // order.cancelled event side effects — never the cancellation itself without an actor.
  if (!opts.triggeredByUserId) {
    throw new BadRequestError("CANCELLATION_ACTOR_REQUIRED", "Cancelling an order requires identifying the acting user.")
  }

  const previousStatus = order.status
  const cancelledAt = new Date()
  const updated = await orderRepository.update(db, order.id, {
    status: "CANCELLED",
    cancelledAt,
    cancelledReason: opts.reason,
    cancelledByUser: opts.triggeredByUserId ? { connect: { id: opts.triggeredByUserId } } : undefined,
  })
  await recordTransition(db, order.id, "CANCELLED", opts.triggeredByUserId, opts.notes)

  await eventBus.publish(
    createEvent("order.cancelled", storeId, opts.triggeredByUserId, {
      orderId: order.id,
      orderNumber: order.number,
      previousStatus,
      cancelledReason: opts.reason,
      cancelledByUserId: opts.triggeredByUserId,
      cancelledAt: cancelledAt.toISOString(),
      isManagerApproved: opts.isManagerApproved ?? false,
    }),
    db,
  )

  return updated
}

// ─────────────────────────────────────────────────────────────────────────
// System-derived transitions — Kitchen/Delivery own these events; Orders
// only projects them onto its own status column and republishes a
// derived, Order-shaped event where API_SPEC.md documents one.
// ─────────────────────────────────────────────────────────────────────────

eventBus.on("kitchen_ticket.status_changed", async (event, db) => {
  if (event.payload.newStatus !== "PREPARING") return
  const order = await orderRepository.findById(db, event.payload.orderId)
  if (!order || order.status !== "CONFIRMED") return
  await orderRepository.update(db, order.id, { status: "PREPARING" })
  await recordTransition(db, order.id, "PREPARING", null)
})

eventBus.on("kitchen_ticket.ready", async (event, db) => {
  const order = await orderRepository.findById(db, event.payload.orderId)
  if (!order || order.status !== "PREPARING") return

  const readyAt = new Date(event.payload.readyAt)
  await orderRepository.update(db, order.id, { status: "READY", readyAt: order.readyAt ?? readyAt })
  await recordTransition(db, order.id, "READY", null)

  await eventBus.publish(
    createEvent("order.ready", event.storeId, null, {
      orderId: order.id,
      orderNumber: order.number,
      type: order.type,
      readyAt: readyAt.toISOString(),
    }),
    db,
  )
})

eventBus.on("delivery.dispatched", async (event, db) => {
  const order = await orderRepository.findById(db, event.payload.orderId)
  if (!order || order.status !== "READY") return

  await orderRepository.update(db, order.id, { status: "OUT_FOR_DELIVERY" })
  await recordTransition(db, order.id, "OUT_FOR_DELIVERY", null)

  await eventBus.publish(
    createEvent("order.out_for_delivery", event.storeId, null, {
      orderId: order.id,
      orderNumber: order.number,
      deliveryId: event.payload.deliveryId,
    }),
    db,
  )
})

eventBus.on("delivery.delivered", async (event, db) => {
  const order = await orderRepository.findById(db, event.payload.orderId)
  if (!order || order.status !== "OUT_FOR_DELIVERY") return

  const deliveredAt = new Date(event.payload.deliveredAt)
  await orderRepository.update(db, order.id, { status: "DELIVERED", deliveredAt: order.deliveredAt ?? deliveredAt })
  await recordTransition(db, order.id, "DELIVERED", null)

  await eventBus.publish(
    createEvent("order.delivered", event.storeId, null, {
      orderId: order.id,
      orderNumber: order.number,
      customerId: order.customerId,
      grandTotal: order.grandTotal,
      type: order.type,
      deliveredAt: deliveredAt.toISOString(),
    }),
    db,
  )
})
