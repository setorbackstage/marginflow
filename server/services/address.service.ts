import "server-only"
import type { DbClient } from "../db"
import type { Address } from "../../generated/prisma/client"
import { addressRepository } from "../repositories"
import { NotFoundError } from "../lib/errors"

export interface CreateAddressInput {
  label?: string
  street: string
  number: string
  complement?: string | null
  neighborhood: string
  city: string
  state: string
  postalCode: string
  country?: string
  latitude?: number | null
  longitude?: number | null
  isDefault?: boolean
}

export type UpdateAddressInput = Partial<CreateAddressInput>

/** Parent-Customer Isolation: Address has no `storeId` of its own (DATA_MODEL.md) — ownership is verified through the Customer, whose own store scope the caller has already checked. */
async function getAddressOrThrow(db: DbClient, customerId: string, id: string): Promise<Address> {
  const address = await addressRepository.findById(db, id)
  if (!address || address.customerId !== customerId) throw new NotFoundError("ADDRESS_NOT_FOUND", "Address does not exist for this customer.")
  return address
}

export const addressService = {
  getById: getAddressOrThrow,
  listByCustomer: addressRepository.findManyByCustomer,
  count: addressRepository.count,

  /**
   * Setting `isDefault: true` clears the default flag on the customer's
   * other addresses. Both writes must land atomically — call this with a
   * transaction client (`prisma.$transaction`) at the Controller layer.
   */
  async create(db: DbClient, customerId: string, input: CreateAddressInput): Promise<Address> {
    if (input.isDefault) {
      await clearDefaults(db, customerId)
    }
    return addressRepository.create(db, { ...input, customer: { connect: { id: customerId } } })
  },

  async update(db: DbClient, customerId: string, id: string, input: UpdateAddressInput): Promise<Address> {
    const address = await getAddressOrThrow(db, customerId, id)
    if (input.isDefault) {
      await clearDefaults(db, address.customerId)
    }
    return addressRepository.update(db, id, input)
  },

  async softDelete(db: DbClient, customerId: string, id: string): Promise<Address> {
    await getAddressOrThrow(db, customerId, id)
    return addressRepository.softDelete(db, id)
  },
}

async function clearDefaults(db: DbClient, customerId: string): Promise<void> {
  const addresses = await addressRepository.findManyByCustomer(db, customerId)
  await Promise.all(
    addresses.filter((address) => address.isDefault).map((address) => addressRepository.update(db, address.id, { isDefault: false })),
  )
}
