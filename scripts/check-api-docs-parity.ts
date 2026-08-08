#!/usr/bin/env tsx
/**
 * Verifica paridade entre (1) rotas implementadas (app/api/v1) e documentadas
 * (docs/API_SPEC.md), e (2) models do Prisma schema e seções documentadas
 * (docs/DATA_MODEL.md).
 * Uso: pnpm tsx scripts/check-api-docs-parity.ts
 * Exit 1 se houver rotas ou models não documentados.
 */
import { readdirSync, readFileSync, statSync } from "fs"
import { join } from "path"

const ROOT = process.cwd()
const API_DIR = join(ROOT, "app/api/v1")
const SPEC_FILE = join(ROOT, "docs/API_SPEC.md")
const SCHEMA_FILE = join(ROOT, "prisma/schema.prisma")
const DATA_MODEL_FILE = join(ROOT, "docs/DATA_MODEL.md")

// ─── collect implemented routes ────────────────────────────────────────────
function collectRoutes(dir: string, base = ""): string[] {
  const routes: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      routes.push(...collectRoutes(full, `${base}/${entry}`))
    } else if (entry === "route.ts") {
      routes.push(base)
    }
  }
  return routes
}

const implemented = collectRoutes(API_DIR)
  .map((r) =>
    r
      // normalize Next.js dynamic segments to :param style
      .replace(/\[([^\]]+)\]/g, ":$1")
      // strip leading slash — we'll compare without it
      .replace(/^\//, ""),
  )
  .sort()

// ─── collect documented paths from API_SPEC.md ────────────────────────────
const spec = readFileSync(SPEC_FILE, "utf-8")

// Extract paths from headings like: ## GET /api/v1/stores/:storeId/orders
const docPaths = new Set<string>()
for (const m of spec.matchAll(/^##\s+\w+\s+(\/api\/v1\/[^\s\n]+)/gm)) {
  const path = m[1]
    .replace(/^\/api\/v1\//, "")
    .replace(/\[([^\]]+)\]/g, ":$1")
  docPaths.add(path)
}

// ─── collect Prisma models ─────────────────────────────────────────────────
const schema = readFileSync(SCHEMA_FILE, "utf-8")
const models = [...schema.matchAll(/^model (\w+) \{/gm)].map((m) => m[1])

// ─── collect documented model sections from DATA_MODEL.md ────────────────
const dataModel = readFileSync(DATA_MODEL_FILE, "utf-8")
const docHeadings = new Set([...dataModel.matchAll(/^# ([A-Z][\w ]*)$/gm)].map((m) => m[1]))

/**
 * DATA_MODEL.md headings are plural, human-readable names that don't map 1:1
 * to Prisma's PascalCase model names (e.g. "Stock Movements" → StockMovement,
 * "Store Settings" → StoreSettings — which is itself plural in the schema).
 * Kept as an explicit table instead of a pluralization heuristic, which
 * breaks on cases like that.
 */
const MODEL_DOC_HEADING: Record<string, string> = {
  Organization: "Organizations",
  Account: "Accounts",
  Store: "Stores",
  StoreSettings: "Store Settings",
  User: "Users",
  Role: "Roles",
  Membership: "Memberships",
  RefreshToken: "Refresh Tokens",
  PasswordResetToken: "Password Reset Tokens",
  InvitationToken: "Invitation Tokens",
  Customer: "Customers",
  Address: "Addresses",
  Category: "Categories",
  Product: "Products",
  ModifierGroup: "Modifier Groups",
  Modifier: "Modifiers",
  Menu: "Menus",
  MenuSection: "Menu Sections",
  Order: "Orders",
  OrderItem: "Order Items",
  OrderStatusTransition: "Order Status Transitions",
  KitchenTicket: "Kitchen Tickets",
  KitchenItem: "Kitchen Items",
  Payment: "Payments",
  PaymentAttempt: "Payment Attempts",
  Delivery: "Deliveries",
  Invoice: "Invoices",
  Ingredient: "Ingredients",
  Recipe: "Recipes",
  RecipeItem: "Recipe Items",
  StockMovement: "Stock Movements",
  MarketplaceAppConfig: "Marketplace App Configs",
  MarketplaceIntegration: "Marketplace Integrations",
  Notification: "Notifications",
  PushSubscription: "Push Subscriptions",
  AuditLog: "Audit Logs",
  Printer: "Printers",
  PrintTemplate: "Print Templates",
  PrintRule: "Print Rules",
  PrintJob: "Print Jobs",
  WebhookEndpoint: "Webhook Endpoints",
}

const undocumentedModels = models.filter((m) => {
  const heading = MODEL_DOC_HEADING[m]
  return !heading || !docHeadings.has(heading)
})

// ─── compare ───────────────────────────────────────────────────────────────
const undocumentedRoutes = implemented.filter((r) => !docPaths.has(r))

let hasGaps = false

if (undocumentedRoutes.length === 0) {
  console.log("✅ All implemented API routes are documented in API_SPEC.md")
} else {
  hasGaps = true
  console.error(`\n❌ ${undocumentedRoutes.length} route(s) implemented but NOT documented in docs/API_SPEC.md:\n`)
  for (const r of undocumentedRoutes) {
    console.error(`  /api/v1/${r}`)
  }
  console.error(
    "\nAdd the missing sections to docs/API_SPEC.md or remove the route if it is not public.\n",
  )
}

if (undocumentedModels.length === 0) {
  console.log("✅ All Prisma models are documented in DATA_MODEL.md")
} else {
  hasGaps = true
  console.error(`\n❌ ${undocumentedModels.length} model(s) defined in schema.prisma but NOT documented in docs/DATA_MODEL.md:\n`)
  for (const m of undocumentedModels) {
    console.error(`  ${m}`)
  }
  console.error(
    "\nAdd the missing sections to docs/DATA_MODEL.md, or register the heading mapping in MODEL_DOC_HEADING if it already exists under a different name.\n",
  )
}

process.exit(hasGaps ? 1 : 0)
