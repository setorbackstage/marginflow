"use client"

import { useQuery } from "@tanstack/react-query"
import { useActiveStoreId } from "@/features/auth"
import { productsApi, categoriesApi } from "@/features/products"
import { customersApi } from "@/features/customers"
import { ordersApi } from "@/features/orders"
import { ingredientsApi, movementsApi } from "@/features/inventory"
import { menusApi } from "@/features/menus"
import { deliveryApi } from "@/features/delivery"

export interface SearchResultItem {
  id: string
  title: string
  subtitle?: string
  url: string
}

export interface SearchResultGroup {
  heading: string
  items: SearchResultItem[]
}

/**
 * Real cross-entity search for the command palette. Products, Categories,
 * Customers, Orders and Ingredients use each list endpoint's own `search`
 * query param. Menus, Deliveries and Movements have no such param in the
 * API, so those three fetch one bounded page (already the shape their own
 * screens use) and filter client-side — never the whole table, and no new
 * endpoint added.
 */
export function useGlobalSearch(query: string) {
  const storeId = useActiveStoreId()
  const term = query.trim()
  const enabled = Boolean(storeId) && term.length >= 2

  return useQuery({
    queryKey: ["global-search", storeId, term],
    enabled,
    queryFn: async (): Promise<SearchResultGroup[]> => {
      const lower = term.toLowerCase()

      const [products, categories, customers, orders, ingredients, menus, deliveries, movements] = await Promise.all([
        productsApi.list(storeId, { page: 1, search: term }),
        categoriesApi.list(storeId, term),
        customersApi.list(storeId, { page: 1, search: term }),
        ordersApi.list(storeId, { page: 1, search: term }),
        ingredientsApi.list(storeId, { page: 1, perPage: 5, search: term }),
        menusApi.list(storeId),
        deliveryApi.list(storeId),
        movementsApi.list(storeId, { page: 1 }),
      ])

      const groups: SearchResultGroup[] = [
        {
          heading: "Produtos",
          items: products.items.slice(0, 5).map((p) => ({ id: p.id, title: p.name, subtitle: p.categoryName, url: "/products" })),
        },
        {
          heading: "Categorias",
          items: categories.slice(0, 5).map((c) => ({ id: c.id, title: c.name, subtitle: `${c.productCount} produtos`, url: "/products" })),
        },
        {
          heading: "Clientes",
          items: customers.items.slice(0, 5).map((c) => ({ id: c.id, title: c.name, subtitle: c.phone, url: "/customers" })),
        },
        {
          heading: "Pedidos",
          items: orders.items.slice(0, 5).map((o) => ({
            id: o.id,
            title: `Pedido #${o.number}`,
            subtitle: o.customerName ?? "Cliente avulso",
            url: `/orders/${o.id}`,
          })),
        },
        {
          heading: "Ingredientes",
          items: ingredients.items.slice(0, 5).map((i) => ({ id: i.id, title: i.name, subtitle: `${i.currentStock} ${i.unit}`, url: "/inventory" })),
        },
        {
          heading: "Cardápios",
          items: menus
            .filter((m) => m.name.toLowerCase().includes(lower))
            .slice(0, 5)
            .map((m) => ({ id: m.id, title: m.name, subtitle: m.status, url: "/menu" })),
        },
        {
          heading: "Entregas",
          items: deliveries.items
            .filter(
              (d) =>
                String(d.orderNumber).includes(term) ||
                d.deliveryAddress.street.toLowerCase().includes(lower) ||
                (d.courierName ?? "").toLowerCase().includes(lower),
            )
            .slice(0, 5)
            .map((d) => ({ id: d.id, title: `Entrega — Pedido #${d.orderNumber}`, subtitle: d.deliveryAddress.street, url: "/delivery" })),
        },
        {
          heading: "Movimentações",
          items: movements.items
            .filter((m) => m.ingredientName.toLowerCase().includes(lower))
            .slice(0, 5)
            .map((m) => ({ id: m.id, title: m.ingredientName, subtitle: m.type, url: "/inventory" })),
        },
      ]

      return groups.filter((group) => group.items.length > 0)
    },
  })
}
