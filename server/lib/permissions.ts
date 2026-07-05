import "server-only"

/**
 * API_SPEC.md's Authorization → "Full Permission Catalog" — the exhaustive,
 * documented list of every `domain:action` permission string in the system.
 * `OWNER` is documented as holding "All permissions", so this constant is
 * exactly that catalog, used only when provisioning a new Store's OWNER
 * Role (see signup.service.ts). Not a business rule invented here — it is
 * copied verbatim from the doc's catalog.
 */
export const ALL_PERMISSIONS: readonly string[] = [
  "orders:view",
  "orders:create",
  "orders:edit",
  "orders:cancel",
  "orders:refund",

  "kitchen:view",
  "kitchen:update_status",

  "delivery:view",
  "delivery:assign_courier",
  "delivery:update_status",

  "products:view",
  "products:create",
  "products:edit",
  "products:delete",

  "menu:view",
  "menu:create",
  "menu:edit",
  "menu:publish",

  "customers:view",
  "customers:create",
  "customers:edit",
  "customers:block",

  "crm:view",
  "crm:manage_campaigns",
  "crm:export",

  "finance:view",
  "finance:export",

  "reports:view",
  "reports:export",

  "settings:view",
  "settings:edit",

  "users:view",
  "users:invite",
  "users:edit",
  "users:remove",

  "store:view",
  "store:edit",

  "billing:view",
  "billing:manage",
]
