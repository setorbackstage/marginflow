export type CustomerStatus = "ACTIVE" | "BLOCKED"

export interface CustomerListItem {
  id: string
  storeId: string
  name: string
  phone: string
  email: string | null
  status: CustomerStatus
  totalOrders: number
  totalSpent: number
  firstOrderAt: string | null
  lastOrderAt: string | null
  createdAt: string
}

export interface CustomerDetail {
  id: string
  name: string
  phone: string
  email: string | null
  taxId: string | null
  notes: string | null
  status: CustomerStatus
  totalOrders: number
  totalSpent: number
  firstOrderAt: string | null
  lastOrderAt: string | null
  addressCount: number
  createdAt: string
  updatedAt: string
}

export type AddressLabel = "HOME" | "WORK" | "OTHER"

export interface Address {
  id: string
  customerId: string
  label: AddressLabel | null
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
  isDefault: boolean
  createdAt: string
}

export interface AddressInput {
  label?: AddressLabel
  street: string
  number: string
  complement?: string | null
  neighborhood: string
  city: string
  state: string
  postalCode: string
  country?: string
  isDefault?: boolean
}

export interface CustomerOrderListItem {
  id: string
  number: number
  status: string
  type: string
  channel: string
  grandTotal: number
  createdAt: string
}

export interface CreateCustomerInput {
  name: string
  phone: string
  email?: string | null
  taxId?: string | null
  notes?: string | null
}

export interface UpdateCustomerInput {
  name?: string
  phone?: string
  email?: string | null
  taxId?: string | null
  notes?: string | null
  status?: CustomerStatus
}

export interface CustomerListParams {
  page?:   number
  limit?:  number
  status?: CustomerStatus
  search?: string
  sort?:   string
  order?:  "asc" | "desc"
}

export interface CustomerSegments {
  total:     number
  active:    number
  blocked:   number
  newLast30: number
  frequent:  number
  atRisk:    number
  churned:   number
}

export interface CustomerOrdersParams {
  page?:  number
  limit?: number
}
