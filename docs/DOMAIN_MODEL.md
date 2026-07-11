# MarginFlow — Domain Model

> **Source of truth for the business domain.**
> Every engineer, every AI, and every product decision must align with this document.
> If a business rule changes, update this document first — before any code changes.
>
> This includes adding a new valid value to an existing attribute's enumeration (e.g., a new Store type, payment gateway, or delivery platform). An enum addition is a business-rule change, not a technical detail, and must be reflected here before `DATA_MODEL.md` or `API_SPEC.md` are updated to match.

---

# Domain Overview

MarginFlow is a Restaurant Operating System (Restaurant OS) — not a POS, not an ERP, not a simple ordering app.

A Restaurant OS is a unified platform that manages the complete operational lifecycle of a food business: from the moment a customer places an order to the moment that order generates financial and relationship data. Every feature in MarginFlow exists to reduce operational friction, eliminate manual rework, and give restaurant operators a clear, real-time view of their business.

The system is designed for:

- **Phase 1 — Delivery-first businesses**: delivery kitchens, pizzerias, burger joints, snack shops, açaí shops, meal prep businesses.
- **Phase 2 — Dine-in operations**: restaurants, cafés, bars, self-service.
- **Phase 3 — Multi-unit businesses**: franchises, restaurant groups, dark kitchens, multi-company.

The central object of the entire system is the **Order**. Every other domain either produces data that leads to an Order, or consumes data that came from an Order. This is not a convention — it is the architectural law of MarginFlow.

```
Customer
  ↓
Sales Channel (in-person, phone, marketplace, WhatsApp, self-service kiosk)
  ↓
Order
  ↓
Kitchen (production)
  ↓
Delivery (if applicable)
  ↓
Payment
  ↓
Finance
  ↓
CRM / Reports
```

All modules operate independently. They communicate through well-defined contracts — never through internal implementation access. A change inside the Kitchen module must not require a change inside the Delivery module.

---

# Core Entities

## Store

**Purpose**
The Store is the fundamental organizational unit of MarginFlow. Every piece of operational data — orders, products, customers, payments — belongs to a Store. Multi-location businesses have multiple Stores, each operating independently while sharing a parent Account.

**Responsibilities**
- Owns all operational data within its boundary.
- Defines its own operating hours, address, and business settings.
- Controls which payment methods are accepted.
- Manages its own product catalog and pricing.
- Is the context for all reports, financial summaries, and CRM data.

**Main Attributes**
- `id` — unique identifier
- `name` — display name (e.g., "Loja Centro")
- `type` — business type: `restaurant`, `dark_kitchen`, `cafe`, `bar`, `pizzeria`, `burger_shop`, `franchise_unit`
- `slug` — URL-friendly identifier
- `status` — `active`, `inactive`, `suspended`
- `phone` — contact number
- `email` — operational contact
- `address` — embedded Address
- `timezone` — IANA timezone string (e.g., `America/Sao_Paulo`)
- `currency` — ISO 4217 code (e.g., `BRL`)
- `operating_hours` — structured schedule per day of week
- `logo_url` — brand asset
- `created_at`, `updated_at`

**Relationships**
- Has many **Users** (via Role assignments)
- Has many **Customers**
- Has many **Products** and **Categories**
- Has many **Orders**
- Has many **Menus**
- Has many **Payments**
- Has many **Deliveries**
- Belongs to one **Account** (future multi-company)

---

## User

**Purpose**
A User is a human operator who interacts with the MarginFlow system on behalf of a Store. Users are not customers — they are the staff: owners, managers, cashiers, kitchen staff, delivery coordinators.

**Responsibilities**
- Authenticates into the system.
- Performs actions according to their assigned Role.
- Creates, manages, and transitions Orders.
- Manages the product catalog.
- Views reports and financial data according to permissions.
- Is the audit trail for all system actions.

**Main Attributes**
- `id`
- `name`
- `email` — used for authentication, must be unique globally
- `phone`
- `avatar_url`
- `status` — `active`, `inactive`, `invited`
- `last_login_at`
- `created_at`, `updated_at`

**Relationships**
- Has one or many **Role** assignments (scoped per Store)
- Belongs to one or many **Stores**
- Creates **Orders**
- Is the actor in all audit log entries

---

## Role

**Purpose**
A Role defines what a User can see and do within a Store. Roles enforce the principle of least privilege — a kitchen attendant should not be able to access financial reports, and a cashier should not be able to delete products.

**Responsibilities**
- Grants or restricts access to features and actions.
- Is scoped to a specific Store (a user can be Manager at one store and Cashier at another).
- Is the single source of truth for permission checks.

**Main Attributes**
- `id`
- `name` — `owner`, `manager`, `cashier`, `kitchen_attendant`, `delivery_coordinator`, `analyst`
- `permissions` — structured list of allowed actions (e.g., `orders:create`, `finance:view`, `products:delete`)
- `is_system_role` — whether it is a built-in role or a custom role
- `created_at`, `updated_at`

**Relationships**
- Assigned to one **User** within the context of one **Store**
- A Store can define custom Roles (future)

---

## Customer

**Purpose**
A Customer is a person who has placed at least one Order at a Store. Customers are the primary subjects of CRM, loyalty, and marketing operations. They are never Users — the systems are kept strictly separate.

**Responsibilities**
- Identifies who placed an Order.
- Accumulates an order history that feeds CRM and segmentation.
- Stores contact and address information for delivery.
- Is the target of campaigns, notifications, and loyalty rewards (future).

**Main Attributes**
- `id`
- `store_id` — Customer belongs to a specific Store
- `name`
- `phone` — primary identifier in most restaurant operations; used for lookup and WhatsApp
- `email` — optional
- `tax_id` — CPF, used for fiscal invoices (optional)
- `notes` — internal operator notes (e.g., "allergic to shellfish")
- `status` — `active`, `blocked`
- `first_order_at`
- `last_order_at`
- `total_orders` — denormalized count
- `total_spent` — denormalized sum
- `created_at`, `updated_at`

**Relationships**
- Belongs to one **Store**
- Has many **Addresses**
- Has many **Orders**

---

## Address

**Purpose**
An Address represents a physical location used for delivery. Customers may have multiple saved addresses. An Order snapshot the delivery address at the time of placement so that future address changes do not corrupt historical data.

**Responsibilities**
- Stores structured location data for delivery routing.
- Is associated with a Customer for reuse across orders.
- Is copied (snapshotted) into an Order at the time of placement.

**Main Attributes**
- `id`
- `customer_id`
- `label` — user-friendly name: `Home`, `Work`, `Other`
- `street`
- `number`
- `complement` — apartment, suite, etc.
- `neighborhood`
- `city`
- `state` — ISO 3166-2 subdivision code
- `postal_code`
- `country` — ISO 3166-1 alpha-2
- `latitude`, `longitude` — for map integrations and routing
- `is_default`
- `created_at`, `updated_at`

**Relationships**
- Belongs to one **Customer**
- Is referenced (not linked) by **Orders** via a denormalized snapshot

---

## Category

**Purpose**
A Category organizes Products into logical groups within a Store's catalog. Categories control how products appear on menus and in the product management interface. They have no operational role beyond organization and display.

**Responsibilities**
- Groups related Products together.
- Controls display order in the catalog and on menus.
- Can be hidden or shown to control menu visibility.

**Main Attributes**
- `id`
- `store_id`
- `name` — e.g., "Pizzas", "Bebidas", "Sobremesas"
- `description`
- `image_url`
- `sort_order` — integer for manual ordering
- `is_active`
- `created_at`, `updated_at`

**Relationships**
- Belongs to one **Store**
- Has many **Products**
- Can appear in one or many **Menus**

---

## Product

**Purpose**
A Product is a sellable item offered by a Store. Products are the items that appear on menus, are added to Orders, and drive all revenue. A product can be a pizza, a drink, a side dish, a combo, or a service charge.

**Responsibilities**
- Defines what can be sold.
- Carries its price, description, image, and availability.
- Groups related **Modifier Groups** that allow customization.
- Controls its own availability schedule (e.g., only available on weekends).
- Is never hardcoded — all products are managed through the catalog.

**Main Attributes**
- `id`
- `store_id`
- `category_id`
- `name`
- `description`
- `price` — base price in the Store's currency (integer cents to avoid floating-point errors)
- `image_url`
- `sku` — optional internal code
- `type` — `simple`, `combo`, `service_charge`
- `status` — `active`, `inactive`, `out_of_stock`
- `is_available` — computed from status + availability schedule
- `availability_schedule` — optional structured schedule (same format as Store operating hours)
- `sort_order`
- `created_at`, `updated_at`

**Relationships**
- Belongs to one **Store**
- Belongs to one **Category**
- Has many **Modifier Groups**
- Appears in one or many **Menus** (via Menu sections)
- Is referenced by **Order Items**

---

## Modifier Group

**Purpose**
A Modifier Group is a set of options that allows a customer to customize a Product. Examples: "Choose your size", "Extra toppings", "Choose your drink". Modifier Groups carry validation rules (minimum and maximum selections) that enforce business constraints at order time.

**Responsibilities**
- Defines a question or customization dimension for a Product.
- Controls how many options a customer must or may select.
- Presents its **Modifiers** as the available choices.

**Main Attributes**
- `id`
- `product_id`
- `store_id`
- `name` — e.g., "Escolha o tamanho", "Adicionais", "Ponto da carne"
- `description`
- `is_required` — whether the customer must make a selection
- `min_selections` — minimum number of Modifiers that must be selected (0 = optional)
- `max_selections` — maximum allowed (1 = single choice, N = multi-select)
- `sort_order`
- `is_active`
- `created_at`, `updated_at`

**Relationships**
- Belongs to one **Product**
- Belongs to one **Store**
- Has many **Modifiers**

---

## Modifier

**Purpose**
A Modifier is a single option within a Modifier Group. It is the actual choice the customer selects: a specific size, an extra topping, a cooking preference. Modifiers can carry an additional price on top of the product's base price.

**Responsibilities**
- Represents one selectable option within a Modifier Group.
- Optionally adds to the Order Item's price.
- Is captured as a snapshot in the Order Item to preserve historical accuracy.

**Main Attributes**
- `id`
- `modifier_group_id`
- `store_id`
- `name` — e.g., "Grande", "Borda recheada", "Ao ponto"
- `price_adjustment` — additional cost in cents (can be zero or negative for discounts)
- `sku`
- `sort_order`
- `is_active`
- `created_at`, `updated_at`

**Relationships**
- Belongs to one **Modifier Group**
- Belongs to one **Store**
- Is referenced (snapshotted) by **Order Item** selected modifiers

---

## Menu

**Purpose**
A Menu is a curated, published view of a Store's product catalog. A Store may have multiple Menus for different channels or time periods: a lunch menu, a delivery menu, a weekend menu, a holiday menu. The Menu is the object that is published to ordering channels.

**Responsibilities**
- Selects which Categories and Products are visible in a specific context.
- Controls the display order of Categories within the Menu.
- Is bound to availability rules (active only during certain hours or days).
- Is the published artifact that customers and ordering channels see.

**Main Attributes**
- `id`
- `store_id`
- `name` — e.g., "Cardápio Delivery", "Cardápio Almoço"
- `description`
- `status` — `active`, `inactive`, `scheduled`
- `channel` — `delivery`, `in_store`, `marketplace`, `kiosk`
- `availability_schedule`
- `sections` — ordered list of Category references with display overrides
- `created_at`, `updated_at`

**Relationships**
- Belongs to one **Store**
- References many **Categories** and **Products**
- Is used by ordering channels to display available items

---

## Order

**Purpose**
The Order is the central entity of MarginFlow. Every business transaction starts as an Order. It records what a customer wants, where they want it, how they want to pay, and the full lifecycle from placement to completion. The Order is immutable in its history — status transitions are logged, not overwritten.

**Responsibilities**
- Records the customer's intent to purchase.
- Carries all items, quantities, modifiers, and prices as snapshots at the time of placement.
- Manages its own lifecycle through a defined, one-directional status machine.
- Produces a Kitchen Ticket upon confirmation.
- Produces a Payment record upon checkout.
- Produces a Delivery record when the order type is delivery.
- Feeds Finance, CRM, and Reports after completion.

**Main Attributes**
- `id`
- `store_id`
- `customer_id` — nullable (anonymous orders are allowed)
- `number` — human-readable sequential number per Store (e.g., #4821)
- `status` — see Order Lifecycle in Business Workflows
- `type` — `delivery`, `takeaway`, `dine_in`
- `channel` — `in_store`, `phone`, `marketplace`, `whatsapp`, `kiosk`
- `delivery_address` — denormalized address snapshot (null for dine_in/takeaway)
- `table_number` — for dine_in orders (future)
- `items_total` — sum of all Order Item totals in cents
- `discount_total` — total discounts applied in cents
- `delivery_fee` — delivery fee in cents
- `grand_total` — final amount charged: items_total − discount_total + delivery_fee
- `notes` — customer instructions (e.g., "no onions")
- `scheduled_for` — nullable datetime for scheduled orders
- `cancelled_reason` — required when status = `cancelled`
- `cancelled_by` — User id who cancelled
- `created_at`, `updated_at`, `confirmed_at`, `ready_at`, `delivered_at`, `cancelled_at`

**Relationships**
- Belongs to one **Store**
- Belongs to one **Customer** (optional)
- Has many **Order Items**
- Has one **Kitchen Ticket** (created on confirmation)
- Has one **Payment**
- Has one **Delivery** (when type = delivery)
- Has one **Invoice** (when fiscal document is generated)

---

## Order Item

**Purpose**
An Order Item is a single line of an Order. It represents one Product, in a specific quantity, with specific Modifier selections, at a specific price. All product data is snapshotted at order time — future changes to the Product catalog do not alter historical Order Items.

**Responsibilities**
- Records exactly what was ordered for a specific product.
- Captures product name, price, and selected modifiers as they were at order time.
- Calculates its own subtotal (unit price × quantity).
- Is the unit of work sent to the kitchen.

**Main Attributes**
- `id`
- `order_id`
- `product_id` — reference to the live catalog (nullable if product was deleted)
- `product_name` — snapshot of product name at order time
- `product_price` — snapshot of unit price at order time (cents)
- `quantity`
- `selected_modifiers` — snapshot array of chosen modifiers with names and price adjustments
- `unit_total` — product_price + sum of modifier price adjustments (cents)
- `subtotal` — unit_total × quantity (cents)
- `notes` — item-level instructions
- `status` — `pending`, `preparing`, `ready`, `cancelled`
- `created_at`, `updated_at`

**Relationships**
- Belongs to one **Order**
- References one **Product** (soft reference; data is snapshotted)

---

## Kitchen Ticket

**Purpose**
A Kitchen Ticket is the production document sent to the kitchen when an Order is confirmed. It is the Kitchen module's interface to the Order — the kitchen sees Tickets, not Orders. This separation ensures the kitchen interface can evolve independently from the ordering interface.

**Responsibilities**
- Represents the kitchen's view of what needs to be produced.
- Carries the ordered items in a format optimized for kitchen display.
- Tracks kitchen-specific status: queued, preparing, ready.
- Records production timestamps for performance analysis.
- Allows the kitchen to mark individual items as done.

**Main Attributes**
- `id`
- `store_id`
- `order_id`
- `order_number` — human-readable, copied from Order
- `order_type` — copied from Order (delivery, takeaway, dine_in)
- `items` — snapshot of Order Items relevant to this kitchen station
- `status` — `queued`, `preparing`, `ready`, `cancelled`
- `notes` — order-level notes relevant to production
- `queued_at` — when the ticket entered the kitchen queue
- `started_at` — when the kitchen started preparing
- `ready_at` — when the kitchen marked the ticket as ready
- `created_at`, `updated_at`

**Relationships**
- Belongs to one **Order**
- Belongs to one **Store**
- Its `ready_at` timestamp is the trigger for **Delivery** to begin

---

## Payment

**Purpose**
A Payment records the financial transaction that settles an Order. An Order may have one Payment. The Payment domain is strictly financial — it does not influence production or delivery.

**Responsibilities**
- Records how an Order was paid.
- Supports multiple payment methods per transaction (e.g., split payment: card + cash).
- Tracks payment status and gateway responses.
- Is the source of truth for financial reconciliation.
- Feeds the Finance module.

**Main Attributes**
- `id`
- `order_id`
- `store_id`
- `amount` — total amount paid in cents
- `status` — `pending`, `authorized`, `paid`, `refunded`, `partially_refunded`, `failed`
- `method` — `cash`, `credit_card`, `debit_card`, `pix`, `voucher`, `gift_card`, `online`
- `gateway` — payment processor used (e.g., `stripe`, `pagarme`, `mercado_pago`, `iugu`, `asaas`, `manual`)
- `gateway_transaction_id` — external reference for reconciliation
- `gateway_response` — raw response stored for audit
- `paid_at`
- `refunded_at`
- `refund_reason`
- `created_at`, `updated_at`

**Relationships**
- Belongs to one **Order**
- Belongs to one **Store**
- May reference one **Invoice**

---

## Delivery

**Purpose**
A Delivery tracks the physical movement of an Order from the Store to the Customer's address. Delivery only begins after the Kitchen marks the corresponding Order as Ready. The Delivery domain manages the logistics layer independently from production and payment.

**Responsibilities**
- Tracks the status of the physical delivery.
- Assigns a courier (internal or via third-party integration).
- Records dispatch and arrival timestamps.
- Provides the delivery address (copied from the Order snapshot).
- Is the integration point for third-party delivery platforms (iFood, Rappi, etc.).

**Main Attributes**
- `id`
- `order_id`
- `store_id`
- `status` — `awaiting_pickup`, `dispatched`, `in_transit`, `delivered`, `failed`, `returned`
- `courier_name` — name of the delivery person
- `courier_phone`
- `courier_type` — `internal`, `platform` (third-party)
- `platform` — if courier_type = platform: `ifood`, `rappi`, `uber_eats`, `loggi`, `other`
- `platform_delivery_id` — external reference
- `delivery_address` — copied from Order (denormalized snapshot)
- `estimated_time` — estimated delivery time in minutes
- `dispatched_at`
- `delivered_at`
- `failed_reason`
- `created_at`, `updated_at`

**Relationships**
- Belongs to one **Order**
- Belongs to one **Store**
- Starts only when the linked **Kitchen Ticket** status = `ready`

---

## Invoice

**Purpose**
An Invoice is a fiscal document generated for a completed and paid Order. It serves legal and tax compliance requirements. Invoice generation is triggered by Payment completion and is not part of the operational flow.

**Responsibilities**
- Generates the fiscal record of a commercial transaction.
- Captures the customer's tax identification for fiscal purposes.
- Stores the fiscal document number and series for tax reporting.
- Is immutable after issuance — corrections require a cancellation and a new Invoice.

**Main Attributes**
- `id`
- `order_id`
- `payment_id`
- `store_id`
- `customer_tax_id` — CPF or CNPJ (may be null for anonymous orders)
- `invoice_number` — sequential fiscal number
- `series` — fiscal document series
- `type` — `nfce` (consumer note), `nfe` (fiscal note)
- `status` — `pending`, `issued`, `cancelled`
- `issued_at`
- `cancelled_at`
- `cancellation_reason`
- `xml_url` — fiscal XML document
- `pdf_url` — printable PDF (DANFE)
- `access_key` — 44-digit fiscal key (chave de acesso)
- `created_at`, `updated_at`

**Relationships**
- Belongs to one **Order**
- Belongs to one **Payment**
- Belongs to one **Store**

---

## Ingredient

**Purpose**
An Ingredient is a raw material (insumo) tracked by the Inventory module: flour, mozzarella, tomato sauce, packaging. Ingredients are what the Store buys, stores, and consumes — they are never sold directly. Selling is always done through Products; the Recipe (ficha técnica) is the bridge between the two.

**Responsibilities**
- Carries the current stock balance (denormalized, always equal to the sum of its Stock Movements).
- Carries the current unit cost, used to compute Recipe costs and snapshot movement costs.
- Defines the minimum stock threshold that drives low-stock alerts.
- Is always expressed in a single base unit — `G` (grams), `ML` (milliliters), or `UN` (units). Recipes always reference quantities in the Ingredient's own base unit. There is no unit conversion anywhere in the domain; presentation layers may display kg/L by dividing by 1000.

**Main Attributes**
- `id`
- `store_id`
- `name` — unique per store
- `unit` — `G`, `ML`, `UN` (base units only; immutable after creation)
- `current_stock` — decimal quantity in base units. May be negative (see Inventory Rules)
- `min_stock` — optional low-stock threshold. Null disables the alert for this ingredient
- `cost_per_unit` — decimal cost in **cents per base unit** (e.g., flour at R$ 5,00/kg = 0.5 cents/g). This is the only monetary field in the system that is not an integer, because per-gram costs are fractional cents; it is a cost input, never a charged amount
- `status` — `active`, `inactive`
- `created_at`, `updated_at`

**Relationships**
- Belongs to one **Store**
- Has many **Stock Movements**
- Appears in many **Recipes** (via Recipe Items)

---

## Recipe (Ficha Técnica)

**Purpose**
A Recipe is the technical sheet (ficha técnica) of a Product: the list of Ingredients and quantities consumed to produce it. It is the source of the Product's cost and the driver of automatic stock consumption when an Order is confirmed.

**Responsibilities**
- Maps one Product to the Ingredients it consumes.
- Defines the yield (rendimento): how many units of the Product one execution of the recipe produces.
- Defines per-ingredient waste percentages (perdas) applied on top of the nominal quantity.
- Provides the computed cost: recipe cost, cost per product unit, and margin against the Product's price.

**Main Attributes**
- `id`
- `store_id`
- `product_id` — one Recipe per Product (unique)
- `yield_quantity` — units of Product produced per recipe execution (default 1)
- `notes`
- `created_at`, `updated_at`

**Recipe Item attributes**
- `id`
- `recipe_id`
- `ingredient_id` — unique per recipe
- `quantity` — amount consumed per recipe execution, in the Ingredient's base unit
- `waste_pct` — percentage loss applied on top of `quantity` (0–100, default 0)

**Derived values (never stored)**
- Effective consumption per Product unit = `quantity × (1 + waste_pct/100) ÷ yield_quantity`
- Recipe cost per Product unit = Σ over items of (effective consumption × ingredient `cost_per_unit`)

**Relationships**
- Belongs to one **Store**
- Belongs to one **Product** (1:1)
- Has many **Recipe Items**, each referencing one **Ingredient**

---

## Stock Movement

**Purpose**
A Stock Movement is one immutable, append-only ledger entry that changes an Ingredient's stock balance. The Ingredient's `current_stock` is always the sum of its movements — movements are never edited or deleted; corrections are made by appending an `ADJUSTMENT`.

**Responsibilities**
- Records every stock change with its type, signed quantity, and the unit cost at the time of the movement (the cost snapshot that feeds CMV).
- Links automatic movements (`SALE_CONSUMPTION`, `SALE_REVERSAL`) to the Order that caused them, with a uniqueness guarantee that makes consumption idempotent.
- Records who performed manual movements and why.

**Main Attributes**
- `id`
- `store_id`
- `ingredient_id`
- `type` — `entry` (purchase/receipt), `exit` (manual withdrawal), `adjustment` (count correction, signed), `loss` (breakage/spoilage), `sale_consumption` (automatic, on order confirmation), `sale_reversal` (automatic, on qualifying cancellation)
- `quantity_delta` — signed decimal in the Ingredient's base unit. Positive for `entry`/`sale_reversal`, negative for `exit`/`loss`/`sale_consumption`, either sign for `adjustment`; never zero
- `unit_cost` — snapshot of the Ingredient's `cost_per_unit` at movement time (cents per base unit). CMV is computed from these snapshots
- `order_id` — set only for `sale_consumption`/`sale_reversal`
- `reason` — required for `adjustment` and `loss`
- `created_by_user_id` — null for automatic movements
- `created_at` (no `updated_at` — movements are immutable)

**Relationships**
- Belongs to one **Store**
- Belongs to one **Ingredient**
- Optionally references one **Order**

---

# Business Workflows

## 1. Customer Journey

This is the end-to-end experience from a customer's perspective.

```
1. Customer contacts the Store via a sales channel:
   - In-person (operator takes the order at the counter)
   - Phone (operator creates the order on behalf of the customer)
   - Marketplace (iFood, Rappi — future)
   - WhatsApp (future)
   - Self-service kiosk (future)

2. Customer (or operator) browses the active Menu for the current channel and time.

3. Customer selects Products and chooses Modifiers for each Product.

4. Customer provides delivery information (address) or chooses takeaway/dine-in.

5. Customer specifies payment method and any special instructions.

6. Order is placed → status moves from Draft to Pending.

7. Store confirms the order → status moves to Confirmed.
   A Kitchen Ticket is generated automatically at this step.

8. Kitchen prepares the order → status moves to Preparing.

9. Kitchen marks the order ready → status moves to Ready.
   If delivery: a Delivery record is created.

10. If delivery: courier dispatches → status moves to Out for Delivery.

11. Order arrives or is picked up → status moves to Delivered.

12. Payment is processed → Payment record is marked as Paid.

13. Invoice is optionally generated.

14. Order data is consumed by Finance, CRM, and Reports.
```

---

## 2. Order Lifecycle

The Order progresses through a strict, one-directional status machine. No backward transitions are permitted.

```
DRAFT
  ↓ (customer/operator finalizes the order)
PENDING
  ↓ (store confirms — Kitchen Ticket is created here)
CONFIRMED
  ↓ (kitchen starts preparing)
PREPARING
  ↓ (kitchen finishes production)
READY
  ↓ (for delivery orders: courier dispatches)
OUT_FOR_DELIVERY   ← only for type = delivery
  ↓
DELIVERED
```

```
CANCELLED  ← can be reached from any status before DELIVERED
            requires: cancelled_reason and cancelled_by
```

Every transition is recorded with a timestamp and the User who triggered it. The status history is append-only and is never modified retroactively.

---

## 3. Kitchen Workflow

The Kitchen operates exclusively through Kitchen Tickets. Kitchen staff do not see the full Order — they see only the production document.

```
1. Order reaches CONFIRMED status.
   → System automatically creates a Kitchen Ticket with status QUEUED.
   → Ticket appears on the Kitchen Display System (KDS).

2. Kitchen attendant views the Ticket:
   - Order number
   - Order type (delivery / takeaway / dine_in)
   - List of items and their modifiers
   - Customer notes
   - Time in queue

3. Kitchen attendant starts preparation:
   → Ticket status moves to PREPARING.
   → started_at timestamp is recorded.

4. Kitchen attendant finishes production:
   → Ticket status moves to READY.
   → ready_at timestamp is recorded.
   → If the Order type is delivery: a Delivery record is created automatically.
   → If the Order type is takeaway: the system notifies the cashier/operator.

5. If the Order is cancelled while the Ticket is active:
   → Ticket status moves to CANCELLED.
   → The ticket is flagged on the KDS display.
```

---

## 4. Delivery Workflow

Delivery is a distinct operational domain that begins only after kitchen production is complete.

```
1. Kitchen Ticket reaches READY status for an Order of type = delivery.
   → System creates a Delivery record with status AWAITING_PICKUP.

2. A delivery coordinator (User with delivery_coordinator role) assigns a courier:
   - Internal courier: name and phone are entered manually.
   - Platform courier: a third-party platform handles the assignment.

3. Courier picks up the order from the Store:
   → Delivery status moves to DISPATCHED.
   → dispatched_at timestamp is recorded.
   → Order status moves to OUT_FOR_DELIVERY.

4. Courier is in transit:
   → Delivery status moves to IN_TRANSIT (optional intermediate step).

5. Courier delivers to the customer:
   → Delivery status moves to DELIVERED.
   → delivered_at timestamp is recorded.
   → Order status moves to DELIVERED.

6. If delivery fails (customer not found, refused delivery, etc.):
   → Delivery status moves to FAILED.
   → failed_reason is recorded.
   → Order status is flagged for manual resolution.
```

---

## 5. Payment Workflow

Payment is processed after the Order is ready or delivered, depending on the Store's operational configuration.

```
1. Order reaches a payable state (READY, OUT_FOR_DELIVERY, or DELIVERED).

2. Cashier or system initiates payment:
   → Payment record is created with status PENDING.

3. Customer presents payment method (cash, card, PIX, etc.).

4. Payment is processed:
   - Cash: operator confirms amount received → status moves to PAID.
   - Card/PIX: gateway processes the transaction.
     → If approved: status moves to PAID, gateway_transaction_id is recorded.
     → If declined: status moves to FAILED, operator retries with a different method.

5. Payment reaches PAID status:
   → Order is marked as financially settled.
   → Finance module records the transaction.
   → Optional: Invoice generation is triggered.

6. Refunds (partial or full):
   → Initiated by a manager (requires manager or owner role).
   → Payment status moves to REFUNDED or PARTIALLY_REFUNDED.
   → refunded_at and refund_reason are recorded.
   → Finance module records the reversal.
```

---

## 6. Inventory Workflow

Stock is consumed automatically at order confirmation — the moment the kitchen commits to producing the order — and replenished by manual entries.

```
1. Store registers Ingredients (unit, cost, minimum stock).

2. Store builds the Recipe (ficha técnica) of each Product:
   → ingredients, quantities, waste percentages, yield.

3. Goods arrive → operator records an ENTRY movement:
   → current_stock increases; unit cost may be updated on the Ingredient.

4. An Order is CONFIRMED:
   → Inventory consumes the order.confirmed event.
   → For each order item whose Product has a Recipe, effective ingredient
     consumption is computed (quantity × (1 + waste_pct/100) ÷ yield × item qty).
   → Quantities are aggregated per Ingredient across all items.
   → One SALE_CONSUMPTION movement per Ingredient is written, linked to the
     Order, in the same transaction that confirms the Order.
   → current_stock decreases. Products without a Recipe are skipped silently.

5. The Order is later READY / DELIVERED:
   → No stock effect. Consumption happened at confirmation.

6. The Order is CANCELLED:
   → If previousStatus = CONFIRMED (kitchen had not started): Inventory writes
     mirroring SALE_REVERSAL movements and current_stock is restored.
   → If previousStatus = PREPARING or later: no reversal — the ingredients
     were physically consumed.

7. Stock drops below min_stock at any point:
   → The ingredient enters the low-stock alert list (dashboard + inventory screen).

8. Periodic physical count:
   → Differences are recorded as ADJUSTMENT movements with a reason.
   → Spoilage/breakage is recorded as LOSS movements with a reason.
```

---

# Business Rules

The following rules are enforced by the system and must never be violated. They represent non-negotiable constraints derived from operational, legal, and data-integrity requirements.

## Order Rules

1. **An Order cannot return to a previous status.** The lifecycle is strictly one-directional: Draft → Pending → Confirmed → Preparing → Ready → Out for Delivery → Delivered.

2. **A Delivered Order cannot be edited.** Once an order reaches the Delivered status, its items, quantities, prices, and delivery address are immutable.

3. **A Cancelled Order requires a reason.** The `cancelled_reason` field is mandatory when transitioning any order to the Cancelled status. Anonymous cancellations are not permitted.

4. **A Cancelled Order requires identification of who cancelled it.** The `cancelled_by` field must record the User id responsible for the cancellation.

5. **An Order in Delivered or Cancelled status cannot be cancelled.** Delivered orders are final. Cancelled orders cannot be cancelled again.

6. **Every Order status transition must be timestamped.** The system records `confirmed_at`, `ready_at`, `delivered_at`, and `cancelled_at` separately. These fields are append-only.

7. **The Order grand_total cannot be modified after the Order is Confirmed.** Price changes after confirmation require cancelling the order and creating a new one.

8. **An Order must contain at least one Order Item.** Empty Orders cannot be placed or confirmed.

9. **Scheduled Orders cannot be confirmed before their scheduled time.** If `scheduled_for` is set, the Order remains in Pending status until the scheduled time window opens.

10. **Order numbers are sequential per Store.** Order #4821 at Store A and Order #4821 at Store B are different Orders. The number is never global.

## Order Item Rules

11. **Order Item prices are snapshotted at the time of placement.** Future changes to a Product's price do not alter existing Order Items.

12. **Order Item modifier selections are snapshotted at the time of placement.** Deleted or renamed Modifiers do not corrupt historical Order data.

13. **A required Modifier Group must have at least `min_selections` Modifiers selected.** An Order Item with an unsatisfied required Modifier Group cannot be added to an Order.

14. **The number of selected Modifiers for a group cannot exceed `max_selections`.** The system enforces this constraint at order creation time.

## Kitchen Rules

15. **The Kitchen only receives Confirmed Orders.** Pending Orders do not generate Kitchen Tickets. The kitchen queue only contains actionable work.

16. **A Kitchen Ticket is created automatically when an Order reaches Confirmed status.** No manual step is required. The creation is atomic with the status transition.

17. **Kitchen Tickets are independent from Orders.** The kitchen module must not depend on the order module's internal implementation. Communication happens through the Ticket entity.

18. **A Ticket cannot go back to Queued once it is in Preparing status.** Kitchen status is also one-directional: Queued → Preparing → Ready.

19. **A Cancelled Order immediately flags its Kitchen Ticket as Cancelled.** Kitchen staff are notified in real time to stop production.

## Delivery Rules

20. **Delivery only begins after the Kitchen marks the Order as Ready.** An Order in Confirmed or Preparing status cannot have a Delivery record created.

21. **Delivery requires a delivery address.** Orders of type `dine_in` or `takeaway` never generate a Delivery record.

22. **A Delivery that has been Dispatched cannot be cancelled without manager approval.** Once a courier is in transit, cancellation requires a manager-level User to authorize.

23. **The delivery address on an Order is immutable after placement.** Address changes require cancelling the order. This prevents couriers from being redirected mid-delivery.

## Payment Rules

24. **An Order can have at most one active Payment record.** Multiple payment attempts are tracked by creating new Payment records with status Failed for declined attempts.

25. **Refunds require manager or owner role.** Cashiers and kitchen staff cannot initiate refunds.

26. **A Refund must record a reason.** `refund_reason` is mandatory on any Payment transitioning to Refunded or Partially Refunded status.

27. **Payment amounts must match the Order grand_total.** A Payment where `amount` ≠ `order.grand_total` is flagged as a discrepancy and requires manual reconciliation.

## Product and Catalog Rules

28. **Products are never hardcoded.** All products exist in the database and are managed through the catalog interface.

29. **A deleted Product is soft-deleted, not physically removed.** Existing Order Items that reference the product must remain intact. The `product_id` reference becomes nullable; the snapshot fields preserve the historical data.

30. **A Product that is `out_of_stock` cannot be added to new Orders.** The ordering interface must hide or disable out-of-stock products.

31. **A Category cannot be deleted while it has active Products.** Products must be reassigned or deactivated before the Category can be removed.

## Finance and Reporting Rules

32. **Finance only consumes completed Orders.** Orders in Draft, Pending, Confirmed, Preparing, Ready, or Out for Delivery status are not included in financial summaries.

33. **Reports are strictly read-only.** No report operation may modify operational data of any kind.

34. **CRM never modifies operational data.** CRM consumes order history and customer data for segmentation and campaigns. It has no write access to Orders, Products, or Payments.

## Store and Multi-tenancy Rules

35. **All data is scoped to a Store.** A User at Store A cannot read, write, or reference data from Store B unless explicitly granted cross-store access (future multi-store management feature).

36. **An Invoice is immutable after issuance.** Corrections require cancelling the original Invoice and issuing a new one. The access_key (chave de acesso) uniquely identifies each fiscal document.

## Inventory Rules

37. **Stock Movements are immutable and append-only.** A movement is never edited or deleted. Corrections are made by appending an `ADJUSTMENT` movement with a mandatory reason.

38. **An Ingredient's `current_stock` always equals the sum of its movements' `quantity_delta`.** The denormalized balance is updated in the same database transaction that inserts the movement — never separately.

39. **Automatic consumption happens exactly once per Order, at confirmation.** Inventory consumes `order.confirmed` and writes at most one `SALE_CONSUMPTION` movement per (Order, Ingredient) pair — enforced by a uniqueness constraint, making the consumer idempotent under event redelivery. `READY` and `DELIVERED` have no stock effect.

40. **Cancellation reverses stock only if the kitchen had not started.** On `order.cancelled` with `previousStatus = CONFIRMED`, Inventory writes mirroring `SALE_REVERSAL` movements (idempotent, same uniqueness rule). With `previousStatus` of `PREPARING` or later, no reversal occurs — the ingredients were physically consumed.

41. **Automatic consumption never blocks an Order and may drive stock negative.** Operational reality wins over bookkeeping: a confirmed sale is always consumed, even into negative stock (which signals a count error and appears as an alert). Manual movements are the opposite: an `EXIT`, `LOSS`, or negative `ADJUSTMENT` that would result in negative stock is rejected (`INSUFFICIENT_STOCK`).

42. **A Product without a Recipe is silently skipped by automatic consumption.** Recipes are opt-in per product; their absence is not an error and never blocks an order.

43. **Modifiers do not consume stock.** In this version, only the Product's own Recipe drives consumption. Modifier-level recipes are a future extension.

44. **An Ingredient referenced by any Recipe cannot be deleted.** It must first be removed from all Recipes; deactivation (`inactive`) is the non-destructive alternative and stops new recipe references without breaking existing ones.

45. **CMV is computed from movement cost snapshots, never from current costs.** Each `SALE_CONSUMPTION`/`SALE_REVERSAL` movement records the Ingredient's `cost_per_unit` at the time it was written. CMV for a period = Σ(|quantity_delta| × unit_cost) of consumptions minus reversals in that period. Changing an Ingredient's cost never rewrites history.

---

# Future Modules

The following domains are not part of the current MVP. They are documented here to ensure the current architecture does not create structural obstacles to their future implementation. Every future module must integrate through well-defined contracts — never through direct access to another feature's internals.

---

## Inventory v2 — Purchasing & Traceability

**Domain**: The Inventory core (Ingredients, Recipes, Stock Movements, automatic consumption, CMV, low-stock alerts) is part of the current system — see Core Entities and Inventory Rules above. This future module extends it with the purchasing and traceability layer: Suppliers, Purchase Orders, receiving against orders, Lots/Batches, expiry-date tracking and expiry alerts, transfers between Stores, and structured physical-count sessions (inventário) that generate `ADJUSTMENT` movements in bulk.

**How it connects without creating dependencies**: Everything lands in the existing `stock_movements` ledger — a received Purchase Order produces `ENTRY` movements, a transfer produces paired `EXIT`/`ENTRY` movements, an expired lot produces `LOSS` movements. The v1 core needs no schema changes; v2 adds its own tables that reference `ingredients.id`.

---

## Reservations

**Domain**: Manages table bookings for dine-in establishments.

**How it connects**: A Reservation may be linked to an Order when the customer arrives and their table order begins. The link is a reference (`reservation_id` on the Order) — the Reservation module has no direct dependency on Order internals.

---

## Loyalty Program

**Domain**: Awards points or stamps to Customers based on completed Orders, redeemable for rewards.

**How it connects**: The Loyalty module subscribes to Order Delivered + Payment Paid events. It reads `customer_id` and `grand_total` from the completed Order. It never modifies Order data.

---

## Coupons

**Domain**: Time-limited discount codes that reduce the Order total.

**How it connects**: At order creation time, the Order module validates and applies a Coupon via a coupon service contract. The applied discount is recorded in `discount_total` on the Order. Coupon usage is tracked in the Coupons module.

---

## Table Management

**Domain**: Visual floor plan management for dine-in operations — table status, covers, session duration.

**How it connects**: Tables reference Orders by `order_id`. When a dine-in Order is created, the Table moves to Occupied status. When the Order is Delivered/paid, the Table returns to Available. The link is a reference, not a dependency.

---

## Franchise Management

**Domain**: Manages multi-unit operations where Stores belong to a Franchise network — royalty tracking, standardized menus, centralized reporting.

**How it connects**: An Account entity (parent of Stores) gains franchise-level attributes. Franchise reporting aggregates data across Stores via store-level reports. Each Store remains fully independent operationally.

---

## Marketplace Integrations

**Domain**: Connects MarginFlow to external ordering platforms (iFood, Rappi, Uber Eats). **Status: Implemented for iFood.**

**Entities:**
- `MarketplaceAppConfig` — application-level OAuth token cache. One row per platform, shared across all stores. The `IFOOD` row holds the `client_credentials` access token refreshed automatically before expiry.
- `MarketplaceIntegration` — the per-store connection record. Holds the `merchantId` (the store's identifier in the marketplace) and operational state (`status`, `isPaused`, `lastSyncAt`).

**iFood Integration Flow:**
1. **Order Ingestion (webhook + poll):** iFood sends a `PLACED` event to `POST /api/webhooks/ifood`. The webhook responds `202` immediately and processes the event via `after()` (fire-and-forget). A fallback cron job (`/api/cron/ifood-poll`) polls every hour for any events missed by the webhook.
2. **Order Normalization:** `mapIfoodOrder()` maps iFood's order schema into the platform-agnostic `MappedMarketplaceOrder` interface. This is the boundary between iFood-specific code and the rest of the system.
3. **Order Creation:** `ingestIfoodOrder()` creates the Order, OrderItems, and KitchenTicket in a single transaction. It saves `customerName`, `customerPhone`, `customerDocument`, and `externalId` directly on the Order.
4. **Status Sync (outbound):** When operators update order status in MarginFlow, the domain event bus triggers outbound calls to iFood's API to keep the marketplace in sync (e.g., confirming, marking as ready, dispatching, cancelling).
5. **Store Pause/Resume:** Operators can close/open their iFood store directly from the Integrations panel — calls `POST /merchant/v1.0/merchants/{id}/statuses` with `CLOSE`/`OPEN`.
6. **Product Catalog Sync:** Products with `ifoodExternalCode` set can be synced (available/unavailable) via the Integrations panel.

**How it connects**: Each marketplace integration acts as an external Order source. Incoming orders are normalized into the standard Order format. The Orders module does not know or care about the source — it only sees an Order with `channel = MARKETPLACE`, plus `externalId` and `deliveredBy` for traceability.

**Event table additions:**

| Event | Produced by | Consumed by |
|---|---|---|
| `order.confirmed` | Orders | iFood sync (confirm order on iFood) |
| `order.ready` | Orders | iFood sync (mark as ready to pickup) |
| `order.out_for_delivery` | Delivery | iFood sync (dispatch order on iFood) |
| `order.cancelled` | Orders | iFood sync (request cancellation on iFood) |

---

## Analytics & AI Assistant

**Domain**: Advanced business intelligence — sales forecasting, demand prediction, menu performance analysis, AI-driven recommendations.

**How it connects**: Analytics consumes read-only snapshots of Orders, Products, Customers, and Payments. It never writes to operational tables. The AI Assistant surfaces insights through the Dashboard without modifying any operational state.

---

## WhatsApp Ordering

**Domain**: A conversational ordering interface delivered via WhatsApp.

**How it connects**: WhatsApp is a sales channel. An order placed via WhatsApp enters the system as a standard Order with `channel = whatsapp`. No special logic is required in the Orders module — the channel is just a label.

---

## Connecting Future Domains Without Creating Dependencies

The architectural principle that makes all future modules possible without entangling the existing system is the **event-driven boundary**.

Every domain transition that matters to another domain is expressed as a domain event:

| Event | Produced by | Consumed by |
|---|---|---|
| `order.confirmed` | Orders | Kitchen, Inventory |
| `kitchen_ticket.ready` | Kitchen | Delivery, Orders |
| `order.ready` *(derived)* | Orders, after consuming `kitchen_ticket.ready` | (future: Analytics, Notifications) |
| `delivery.delivered` | Delivery | Orders |
| `order.delivered` *(derived)* | Orders, after consuming `delivery.delivered` | CRM, Reports, Analytics |
| `payment.paid` | Payments | Finance, Invoice, Loyalty |
| `order.completed` | Orders | CRM, Reports, Analytics |
| `stock.movement_created` | Inventory | (future: Analytics) |
| `stock.low` | Inventory | (future: Notifications) |
| `coupon.applied` | Coupons | Orders |

> Kitchen and Delivery each publish exactly one raw event per transition they own (`kitchen_ticket.ready`, `delivery.delivered`, and so on). Orders consumes those raw events, advances its own status, and republishes an Order-shaped derived event for consumers that should never need to know Kitchen or Delivery exist. No module ever consumes both a raw event and its derived echo for the same transition. The full event catalog — including `order.out_for_delivery`, `order.cancelled`, and every payload — is the authoritative one in `API_SPEC.md`; this table is illustrative, not exhaustive.

Each module publishes its events and subscribes to the events it needs. No module ever imports another module's internal functions, hooks, or services. The contract is the event shape — a pure data structure with no behavioral coupling.

This is how MarginFlow can grow from 10 features to 50 features without increasing the complexity of any individual module. Each new feature adds to the system's capability without modifying the system's existing structure.
