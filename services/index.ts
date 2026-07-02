/**
 * Services layer — the boundary between UI and external data sources.
 *
 * Each service module lives in its own file and is responsible for
 * communicating with a single API domain (e.g. orders, inventory, auth).
 *
 * Pattern:
 *   services/
 *     orders.ts     ← all order-related API calls
 *     inventory.ts  ← all inventory-related API calls
 *     customers.ts  ← all customer-related API calls
 *
 * No fetch() calls belong in components or hooks — they belong here.
 */
