import "server-only"
import type { DbClient } from "../db"
import type { Customer } from "../../generated/prisma/client"
import { customerRepository } from "../repositories"
import { ConflictError, NotFoundError } from "../lib/errors"
import { eventBus } from "../lib/events"

export interface CreateCustomerInput {
  name: string
  phone: string
  email?: string | null
  taxId?: string | null
  notes?: string | null
}

/** `totalOrders`/`totalSpent` are deliberately absent — API_SPEC.md: "read-only, computed by the system." */
export interface UpdateCustomerInput {
  name?: string
  phone?: string
  email?: string | null
  taxId?: string | null
  notes?: string | null
  status?: string
}

async function getCustomerOrThrow(db: DbClient, id: string): Promise<Customer> {
  const customer = await customerRepository.findById(db, id)
  if (!customer) throw new NotFoundError("CUSTOMER_NOT_FOUND", "Customer does not exist in this store.")
  return customer
}

/**
 * Store Isolation (API_SPEC.md) for the Customers module's own routes, where
 * `id` is client-supplied from the URL path. Kept separate from `getById`
 * (unchecked) because Orders' `_order-response.ts` already calls `getById`
 * with an `order.customerId` that was already verified store-scoped via the
 * Order itself — that call site is out of scope for this phase.
 */
async function getCustomerInStoreOrThrow(db: DbClient, storeId: string, id: string): Promise<Customer> {
  const customer = await getCustomerOrThrow(db, id)
  if (customer.storeId !== storeId) throw new NotFoundError("CUSTOMER_NOT_FOUND", "Customer does not exist in this store.")
  return customer
}

export const customerService = {
  getById: getCustomerOrThrow,
  getByIdInStore: getCustomerInStoreOrThrow,
  listByStore: customerRepository.findManyByStore,
  count: customerRepository.count,

  async create(db: DbClient, storeId: string, input: CreateCustomerInput): Promise<Customer> {
    const existing = await customerRepository.findByStoreAndPhone(db, storeId, input.phone)
    if (existing) {
      throw new ConflictError("PHONE_ALREADY_REGISTERED", "Phone number already used by another customer at this store.")
    }
    return customerRepository.create(db, { ...input, store: { connect: { id: storeId } } })
  },

  async update(db: DbClient, storeId: string, id: string, input: UpdateCustomerInput): Promise<Customer> {
    await getCustomerInStoreOrThrow(db, storeId, id)
    return customerRepository.update(db, id, input)
  },
}

// Business Rule (Customer): total_orders/last_order_at maintained by the service
// layer on Order completion — DATA_MODEL.md's "Denormalized aggregates" note.
eventBus.on("order.delivered", "customer.service:order.delivered", async (event, db) => {
  const { customerId, deliveredAt } = event.payload
  if (!customerId) return

  const customer = await customerRepository.findById(db, customerId)
  if (!customer) return

  await customerRepository.update(db, customerId, {
    totalOrders: { increment: 1 },
    lastOrderAt: new Date(deliveredAt),
    firstOrderAt: customer.firstOrderAt ?? new Date(deliveredAt),
  })
})

// Business Rule (Customer): total_spent maintained on Payment reaching PAID —
// not on order.delivered, matching the order.delivered event contract note:
// "does NOT update total_spent — that waits for payment.paid".
eventBus.on("payment.paid", "customer.service:payment.paid", async (event, db) => {
  const { customerId, amount } = event.payload
  if (!customerId) return

  const customer = await customerRepository.findById(db, customerId)
  if (!customer) return

  await customerRepository.update(db, customerId, { totalSpent: { increment: amount } })
})
