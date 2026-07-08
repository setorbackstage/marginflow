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

  "inventory:view",
  "inventory:manage",
  "inventory:adjust",
]

/**
 * API_SPEC.md's Authorization → "Built-in Roles and their default Permission
 * sets" table. Copied verbatim from the doc — not invented here. Used to
 * provision every store's full role catalog at signup (see
 * signup.service.ts); previously only OWNER was provisioned, leaving no
 * assignable role for `POST /team/invite` to grant on a freshly signed-up
 * store (the endpoint explicitly rejects assigning OWNER via invitation).
 */
export const BUILT_IN_ROLES: readonly { name: string; displayName: string; permissions: readonly string[] }[] = [
  { name: "OWNER", displayName: "Proprietário", permissions: ALL_PERMISSIONS },
  {
    name: "MANAGER",
    displayName: "Gerente",
    permissions: ALL_PERMISSIONS.filter((p) => !p.startsWith("billing:") && p !== "users:remove"),
  },
  {
    name: "CASHIER",
    displayName: "Caixa",
    permissions: ["orders:view", "orders:create", "orders:edit", "orders:cancel", "customers:view", "customers:create"],
  },
  {
    name: "KITCHEN_ATTENDANT",
    displayName: "Cozinha",
    permissions: ["kitchen:view", "kitchen:update_status", "orders:view"],
  },
  {
    name: "DELIVERY_COORDINATOR",
    displayName: "Entregador",
    permissions: ["delivery:view", "delivery:assign_courier", "delivery:update_status", "orders:view"],
  },
  {
    name: "ANALYST",
    displayName: "Atendente",
    permissions: ["reports:view", "reports:export", "finance:view", "orders:view", "products:view", "customers:view", "inventory:view"],
  },
]
