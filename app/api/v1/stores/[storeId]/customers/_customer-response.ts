import "server-only"
import type { Address, Customer } from "@/generated/prisma/client"
import { prisma } from "@/server/db"
import { addressService } from "@/server/services"

/** API_SPEC.md `GET /api/v1/stores/:storeId/customers` — list item shape. */
export function toCustomerListItem(customer: Customer) {
  return {
    id: customer.id,
    storeId: customer.storeId,
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
    status: customer.status,
    totalOrders: customer.totalOrders,
    totalSpent: customer.totalSpent,
    firstOrderAt: customer.firstOrderAt,
    lastOrderAt: customer.lastOrderAt,
    createdAt: customer.createdAt,
  }
}

/** API_SPEC.md `GET /api/v1/stores/:storeId/customers/:customerId` — includes `addressCount`, no `storeId` (per documented shape). */
export async function toCustomerDetailResponse(customer: Customer) {
  const addressCount = await addressService.count(prisma, customer.id)
  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
    taxId: customer.taxId,
    notes: customer.notes,
    status: customer.status,
    totalOrders: customer.totalOrders,
    totalSpent: customer.totalSpent,
    firstOrderAt: customer.firstOrderAt,
    lastOrderAt: customer.lastOrderAt,
    addressCount,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  }
}

/** API_SPEC.md `GET .../addresses` and address mutation responses — shared shape. */
export function toAddressResponse(address: Address) {
  return {
    id: address.id,
    customerId: address.customerId,
    label: address.label,
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
    isDefault: address.isDefault,
    createdAt: address.createdAt,
  }
}
