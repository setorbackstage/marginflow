import { api, type Page } from "@/lib/api"
import type {
  Address,
  AddressInput,
  CreateCustomerInput,
  CustomerDetail,
  CustomerListItem,
  CustomerListParams,
  CustomerOrderListItem,
  CustomerOrdersParams,
  CustomerSegments,
  UpdateCustomerInput,
} from "./types"

function qs(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value))
  }
  const s = search.toString()
  return s ? `?${s}` : ""
}

export const customersApi = {
  list: (storeId: string, params: CustomerListParams): Promise<Page<CustomerListItem>> =>
    api.getPage<CustomerListItem>(
      `/stores/${storeId}/customers${qs({
        page:   params.page  ?? 1,
        limit:  params.limit ?? 20,
        status: params.status,
        search: params.search,
        sort:   params.sort,
        order:  params.order,
      })}`,
    ),

  get: (storeId: string, customerId: string) =>
    api.get<CustomerDetail>(`/stores/${storeId}/customers/${customerId}`),

  create: (storeId: string, input: CreateCustomerInput) =>
    api.post<CustomerDetail>(`/stores/${storeId}/customers`, input),

  update: (storeId: string, customerId: string, input: UpdateCustomerInput) =>
    api.patch<CustomerDetail>(`/stores/${storeId}/customers/${customerId}`, input),

  listOrders: (storeId: string, customerId: string, params: CustomerOrdersParams = {}) =>
    api.getPage<CustomerOrderListItem>(
      `/stores/${storeId}/customers/${customerId}/orders${qs({
        page:  params.page  ?? 1,
        limit: params.limit ?? 10,
      })}`,
    ),

  segments: (storeId: string) =>
    api.get<CustomerSegments>(`/stores/${storeId}/customers/segments`),
}

export const addressesApi = {
  list: (storeId: string, customerId: string) =>
    api.get<Address[]>(`/stores/${storeId}/customers/${customerId}/addresses`),

  create: (storeId: string, customerId: string, input: AddressInput) =>
    api.post<Address>(`/stores/${storeId}/customers/${customerId}/addresses`, input),

  update: (storeId: string, customerId: string, addressId: string, input: Partial<AddressInput>) =>
    api.patch<Address>(`/stores/${storeId}/customers/${customerId}/addresses/${addressId}`, input),

  remove: (storeId: string, customerId: string, addressId: string) =>
    api.del(`/stores/${storeId}/customers/${customerId}/addresses/${addressId}`),
}
