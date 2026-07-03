/**
 * Features — vertical slices of the MarginFlow domain.
 *
 * Each feature directory owns its own components, hooks, services, types, and utils.
 * Import directly from the feature's own index to keep dependencies explicit:
 *
 *   import type { Order } from "@/features/orders/types"
 *   import type { Product } from "@/features/products/types"
 *   import type { Customer } from "@/features/customers/types"
 *
 * Never import from another feature's internal files — only from its index.ts.
 * Never import from this file — it is a directory manifest, not a public API.
 *
 * Current features:
 *   stores      — Store, Account, Organization, StoreSettings
 *   users       — User, Role, Permission, Membership
 *   customers   — Customer, Address
 *   orders      — Order, OrderItem, OrderStatus
 *   products    — Product, Category, ModifierGroup, Modifier, Menu
 *   kitchen     — KitchenTicket, KitchenItem
 *   delivery    — Delivery, Courier
 *   payments    — Payment, PaymentAttempt
 *   dashboard   — (UI only — no domain types)
 *   finance     — (read layer over payments + orders — no domain types yet)
 *   reports     — (read layer — no domain types yet)
 *   crm         — (read layer over customers + orders — no domain types yet)
 *   settings    — (UI only — delegates to StoreSettings)
 */
