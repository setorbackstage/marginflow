# MarginFlow — Data Model

> **Single source of truth for the MarginFlow database.**
>
> Every engineer and every AI working on this project must read this document before designing any schema, writing any migration, or building any service that touches the database.
>
> If a business rule changes, update `DOMAIN_MODEL.md` first, then update this document to reflect the database consequence. Never let these two documents diverge.

---

## Design Principles

Before reading the entity definitions, understand the five decisions that shape every table in this schema.

**1. Money is always integer cents.**
Every monetary column is stored as `INTEGER` — never `DECIMAL`, never `FLOAT`, never `NUMERIC`. `R$10,99` is stored as `1099`. This eliminates floating-point rounding errors entirely. All arithmetic on prices happens in integer space.

**2. Every entity is immutable in its history.**
Orders, Order Items, Order Status Transitions, Payments, Payment Attempts, and Invoices are never physically deleted. They are the permanent record of what happened. Status changes move an entity forward — they never erase the past.

**3. Snapshots over live references for order data.**
When a customer places an Order, the product name, product price, and modifier selections are copied into the Order Item as JSONB snapshots. If the operator renames a product or changes a price the next day, the historical order is unaffected. The `product_id` is a soft reference for tracing — not a dependency.

**4. Every operational table is scoped to a Store.**
`store_id` appears as a foreign key on every table that holds operational data. All queries from the application layer must include `store_id` in the WHERE clause. This is the multi-tenancy boundary.

**5. Status fields are TEXT with CHECK constraints, not PostgreSQL ENUMs.**
PostgreSQL ENUM types require `ALTER TYPE` to add new values — a locking DDL operation. TEXT with CHECK constraints allows adding new status values via a simple constraint change without table locks. Prisma's application-level enum validation is the primary guard.

---

# Organizations

**Purpose**
The top-level entity for multi-company and franchise management. An Organization owns one or more Accounts. This entity is reserved for Phase 3 (franchise networks and restaurant groups). In Phase 1 and Phase 2, most deployments will not use this table.

**Table name:** `organizations`

**Primary Key:** `id UUID`

**Unique Constraints**
- None beyond the primary key.

**Foreign Keys**
- None. Organizations are the root of the hierarchy.

**Indexes**
- Primary key index on `id` (automatic).

| Column | Type | Nullable | Default | Constraints | Explanation |
|---|---|---|---|---|---|
| `id` | UUID | No | `gen_random_uuid()` | PK | Unique identifier. |
| `name` | TEXT | No | — | NOT NULL | Legal or trade name of the organization. |
| `type` | TEXT | No | — | NOT NULL, CHECK IN ('FRANCHISE', 'RESTAURANT_GROUP', 'HOLDING_COMPANY') | The organizational structure type. |
| `tax_id` | TEXT | Yes | NULL | — | CNPJ or equivalent tax identifier. |
| `logo_url` | TEXT | Yes | NULL | — | URL of the organization brand asset. |
| `created_at` | TIMESTAMPTZ | No | `now()` | NOT NULL | UTC timestamp of record creation. |
| `updated_at` | TIMESTAMPTZ | No | `now()` | NOT NULL | UTC timestamp of last modification. |

---

# Accounts

**Purpose**
The billing and subscription unit. A single business owner has one Account. An Account contains one or more Stores. Authentication and billing are bound to the Account, not to individual Stores. An Account may belong to an Organization (franchise scenario) or stand alone (independent restaurant).

**Table name:** `accounts`

**Primary Key:** `id UUID`

**Unique Constraints**
- `email` — globally unique. No two Accounts share the same billing email.

**Foreign Keys**
- `organization_id → organizations.id` (nullable)

**Indexes**
- Primary key index on `id` (automatic).
- Index on `email` (enforces uniqueness, accelerates auth lookups).
- Index on `organization_id` (find all accounts in a franchise).

| Column | Type | Nullable | Default | Constraints | Explanation |
|---|---|---|---|---|---|
| `id` | UUID | No | `gen_random_uuid()` | PK | Unique identifier. |
| `organization_id` | UUID | Yes | NULL | FK → organizations.id, SET NULL on delete | Null for independent restaurants. Non-null for franchise/group members. |
| `name` | TEXT | No | — | NOT NULL | Legal business name used for billing. |
| `email` | TEXT | No | — | NOT NULL, UNIQUE | Primary billing contact. Used for subscription management. |
| `phone` | TEXT | Yes | NULL | — | Billing contact phone number. |
| `tax_id` | TEXT | Yes | NULL | — | CNPJ or equivalent tax registration number. |
| `plan` | TEXT | No | `'FREE'` | NOT NULL, CHECK IN ('FREE', 'STARTER', 'PRO', 'ENTERPRISE') | Subscription plan tier. Determines feature availability. |
| `status` | TEXT | No | `'ACTIVE'` | NOT NULL, CHECK IN ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PAST_DUE') | Lifecycle status. SUSPENDED and PAST_DUE block system access. |
| `trial_ends_at` | TIMESTAMPTZ | Yes | NULL | — | Null after trial expires or if no trial was given. |
| `created_at` | TIMESTAMPTZ | No | `now()` | NOT NULL | UTC timestamp of record creation. |
| `updated_at` | TIMESTAMPTZ | No | `now()` | NOT NULL | UTC timestamp of last modification. |

---

# Stores

**Purpose**
The fundamental operational unit of MarginFlow. Every piece of operational data — orders, products, customers, payments — belongs to a Store. A multi-location business has multiple Stores, each operating independently under the same Account.

**Table name:** `stores`

**Primary Key:** `id UUID`

**Unique Constraints**
- `slug` — globally unique URL-friendly identifier.

**Foreign Keys**
- `account_id → accounts.id` (RESTRICT on delete — an Account with Stores cannot be deleted)

**Indexes**
- Primary key index on `id` (automatic).
- Index on `account_id` (find all stores for an account).
- Unique index on `slug` (fast lookup and uniqueness).

| Column | Type | Nullable | Default | Constraints | Explanation |
|---|---|---|---|---|---|
| `id` | UUID | No | `gen_random_uuid()` | PK | Unique identifier. |
| `account_id` | UUID | No | — | NOT NULL, FK → accounts.id RESTRICT | The parent billing account. Cannot be null. |
| `name` | TEXT | No | — | NOT NULL | Display name shown in the interface (e.g., "Loja Centro"). |
| `slug` | TEXT | No | — | NOT NULL, UNIQUE | URL-friendly identifier. Auto-generated from name. Immutable after creation. |
| `type` | TEXT | No | — | NOT NULL, CHECK IN ('RESTAURANT', 'DARK_KITCHEN', 'CAFE', 'BAR', 'PIZZERIA', 'BURGER_SHOP', 'FRANCHISE_UNIT') | Business category. Used for UI customization and feature availability. |
| `status` | TEXT | No | `'ACTIVE'` | NOT NULL, CHECK IN ('ACTIVE', 'INACTIVE', 'SUSPENDED') | Lifecycle status. INACTIVE hides from operators. SUSPENDED blocks all operations. |
| `phone` | TEXT | No | — | NOT NULL | Primary operational contact phone. |
| `email` | TEXT | No | — | NOT NULL | Operational contact email for notifications. |
| `logo_url` | TEXT | Yes | NULL | — | URL of the store brand asset. |
| `timezone` | TEXT | No | `'America/Sao_Paulo'` | NOT NULL | IANA timezone string. All local time calculations use this. |
| `currency` | TEXT | No | `'BRL'` | NOT NULL, CHECK IN ('BRL', 'USD', 'EUR') | ISO 4217 currency code. All monetary values stored in this currency's cents. |
| `minimum_order_value` | INTEGER | No | `0` | NOT NULL, CHECK >= 0 | Minimum order total in cents. 0 means no minimum enforced. |
| `delivery_fee` | INTEGER | No | `0` | NOT NULL, CHECK >= 0 | Default delivery fee in cents. May be overridden per order. |
| `operating_hours` | JSONB | No | — | NOT NULL | Structured weekly schedule (WeeklySchedule type). Stored as JSONB for flexibility. Format: { monday: { isOpen, slots: [{open, close}] }, … }. |
| `address_street` | TEXT | Yes | NULL | — | Store physical address — street name. |
| `address_number` | TEXT | Yes | NULL | — | Store physical address — building number. |
| `address_complement` | TEXT | Yes | NULL | — | Store physical address — apartment, suite, etc. |
| `address_neighborhood` | TEXT | Yes | NULL | — | Store physical address — neighborhood/district. |
| `address_city` | TEXT | Yes | NULL | — | Store physical address — city. |
| `address_state` | TEXT | Yes | NULL | — | Store physical address — ISO 3166-2 subdivision code (e.g., "SP"). |
| `address_postal_code` | TEXT | Yes | NULL | — | Store physical address — postal code / CEP. |
| `address_country` | TEXT | No | `'BR'` | NOT NULL | Store physical address — ISO 3166-1 alpha-2 code. |
| `address_latitude` | NUMERIC(10,7) | Yes | NULL | — | GPS latitude for map integrations. |
| `address_longitude` | NUMERIC(10,7) | Yes | NULL | — | GPS longitude for map integrations. |
| `created_at` | TIMESTAMPTZ | No | `now()` | NOT NULL | UTC timestamp of record creation. |
| `updated_at` | TIMESTAMPTZ | No | `now()` | NOT NULL | UTC timestamp of last modification. |

> **Design note — Store address as flat columns:** The Store address is stored as flat columns (not JSONB) because it is indexed, queried directly (for map integrations and geographic reports), and rarely changes. Order and Delivery addresses are stored as JSONB snapshots because they are point-in-time copies that must never be joined or filtered.

---

# Store Settings

**Purpose**
Operational configuration for a Store. Kept separate from the `stores` table to allow the core Store identity (name, address, timezone) to evolve independently from operational preferences. A Store always has exactly one StoreSettings record.

**Table name:** `store_settings`

**Primary Key:** `id UUID`

**Unique Constraints**
- `store_id` — one settings record per store.

**Foreign Keys**
- `store_id → stores.id` (CASCADE on delete — settings are destroyed with the store)

**Indexes**
- Primary key on `id` (automatic).
- Unique index on `store_id` (enforces 1:1 and fast lookup).

| Column | Type | Nullable | Default | Constraints | Explanation |
|---|---|---|---|---|---|
| `id` | UUID | No | `gen_random_uuid()` | PK | Unique identifier. |
| `store_id` | UUID | No | — | NOT NULL, UNIQUE, FK → stores.id CASCADE | References the parent store. Cascade delete removes settings when store is deleted. |
| `auto_confirm_orders` | BOOLEAN | No | `false` | NOT NULL | When true, orders skip the manual confirmation step and jump to CONFIRMED automatically. |
| `print_receipt_on_confirm` | BOOLEAN | No | `false` | NOT NULL | When true, a receipt is automatically queued for printing when an order is confirmed. |
| `receipt_format` | TEXT | No | `'THERMAL_80MM'` | NOT NULL, CHECK IN ('A4', 'THERMAL_80MM', 'THERMAL_58MM') | Paper format for receipt printing. |
| `allow_scheduled_orders` | BOOLEAN | No | `false` | NOT NULL | Whether customers can place orders scheduled for a future time. |
| `max_scheduled_days_ahead` | INTEGER | No | `7` | NOT NULL, CHECK >= 1 | Maximum number of days in advance a scheduled order can be placed. |
| `accepts_cash` | BOOLEAN | No | `true` | NOT NULL | Whether cash payments are accepted. |
| `accepts_card` | BOOLEAN | No | `true` | NOT NULL | Whether card payments (credit or debit) are accepted. |
| `accepts_pix` | BOOLEAN | No | `true` | NOT NULL | Whether Pix instant payments are accepted. |
| `accepts_voucher` | BOOLEAN | No | `false` | NOT NULL | Whether meal vouchers (e.g., VR, Alelo) are accepted. |
| `accepts_online_payment` | BOOLEAN | No | `false` | NOT NULL | Whether online/gateway payments are enabled. |
| `notification_preferences` | JSONB | No | `'{}'` | NOT NULL | Per-event notification channel configuration. Format: { newOrder: ['IN_APP', 'WHATSAPP'], … }. |
| `updated_at` | TIMESTAMPTZ | No | `now()` | NOT NULL | UTC timestamp of last modification. |

---

# Users

**Purpose**
A User is a human operator who interacts with MarginFlow on behalf of a Store. Users are staff — owners, managers, cashiers, kitchen attendants, delivery coordinators. Users are strictly separate from Customers. A User's identity is global; their permissions are scoped per Store via Memberships.

**Table name:** `users`

**Primary Key:** `id UUID`

**Unique Constraints**
- `email` — globally unique across all stores and accounts.

**Foreign Keys**
- None. Users are global entities — their Store associations are managed through the `memberships` table.

**Indexes**
- Primary key on `id` (automatic).
- Unique index on `email`.

| Column | Type | Nullable | Default | Constraints | Explanation |
|---|---|---|---|---|---|
| `id` | UUID | No | `gen_random_uuid()` | PK | Unique identifier. |
| `name` | TEXT | No | — | NOT NULL | Full display name. |
| `email` | TEXT | No | — | NOT NULL, UNIQUE | Authentication identifier. Globally unique. |
| `phone` | TEXT | Yes | NULL | — | Optional contact phone number. |
| `avatar_url` | TEXT | Yes | NULL | — | Profile image URL. |
| `password_hash` | TEXT | Yes | NULL | — | Hashed password (never plaintext). Null while `status = INVITED` — the user has not set a password yet, per `POST /auth/accept-invitation`. |
| `status` | TEXT | No | `'INVITED'` | NOT NULL, CHECK IN ('ACTIVE', 'INACTIVE', 'INVITED') | INVITED = has not yet set a password. INACTIVE = access revoked. |
| `last_login_at` | TIMESTAMPTZ | Yes | NULL | — | UTC timestamp of the most recent successful login. Null for new users. |
| `created_at` | TIMESTAMPTZ | No | `now()` | NOT NULL | UTC timestamp of record creation. |
| `updated_at` | TIMESTAMPTZ | No | `now()` | NOT NULL | UTC timestamp of last modification. |

---

# Roles

**Purpose**
A Role defines what a User can see and do within a specific Store. Roles enforce least privilege. The same person can hold different Roles at different Stores (e.g., Owner at Store A, read-only Analyst at Store B). System roles are built-in and cannot be deleted. Custom roles are a future feature.

**Table name:** `roles`

**Primary Key:** `id UUID`

**Unique Constraints**
- `(store_id, name)` — a store cannot have two roles with the same name.

**Foreign Keys**
- `store_id → stores.id` (RESTRICT on delete — a store with roles cannot be deleted without first removing them)

**Indexes**
- Primary key on `id` (automatic).
- Index on `store_id` (list all roles for a store).
- Unique index on `(store_id, name)`.

| Column | Type | Nullable | Default | Constraints | Explanation |
|---|---|---|---|---|---|
| `id` | UUID | No | `gen_random_uuid()` | PK | Unique identifier. |
| `store_id` | UUID | No | — | NOT NULL, FK → stores.id RESTRICT | The store this role is scoped to. Roles are never global. |
| `name` | TEXT | No | — | NOT NULL, CHECK IN ('OWNER', 'MANAGER', 'CASHIER', 'KITCHEN_ATTENDANT', 'DELIVERY_COORDINATOR', 'ANALYST') | Machine-readable role identifier. |
| `display_name` | TEXT | No | — | NOT NULL | Human-readable label shown in the UI. |
| `permissions` | TEXT[] | No | `'{}'` | NOT NULL | Array of permission strings in domain:action format (e.g., '{orders:create,orders:view}'). |
| `is_system_role` | BOOLEAN | No | `true` | NOT NULL | True for built-in roles. False for operator-defined custom roles (future). System roles cannot be deleted. |
| `created_at` | TIMESTAMPTZ | No | `now()` | NOT NULL | UTC timestamp of record creation. |
| `updated_at` | TIMESTAMPTZ | No | `now()` | NOT NULL | UTC timestamp of last modification. |

> **Design note — TEXT[] for permissions:** Permissions are stored as a PostgreSQL text array rather than JSONB because they are a flat list of strings with no nested structure. TEXT[] supports the `@>` (contains) and `&&` (overlaps) operators, enabling efficient permission checks directly in SQL when needed.

---

# Memberships

**Purpose**
Membership is the join between a User, a Store, and a Role. It answers: "What is this user allowed to do in this store?" A User may have multiple Memberships — one per Store they belong to. Changing a user's role means updating their Membership record, not their User record.

**Table name:** `memberships`

**Primary Key:** `id UUID`

**Unique Constraints**
- `(user_id, store_id)` — a user can hold at most one active role per store at a time.

**Foreign Keys**
- `user_id → users.id` (RESTRICT on delete)
- `store_id → stores.id` (RESTRICT on delete)
- `role_id → roles.id` (RESTRICT on delete)
- `invited_by_user_id → users.id` (SET NULL on delete)

**Indexes**
- Primary key on `id` (automatic).
- Unique index on `(user_id, store_id)`.
- Index on `store_id` (list all members of a store).
- Index on `user_id` (list all stores a user belongs to).

| Column | Type | Nullable | Default | Constraints | Explanation |
|---|---|---|---|---|---|
| `id` | UUID | No | `gen_random_uuid()` | PK | Unique identifier. |
| `user_id` | UUID | No | — | NOT NULL, FK → users.id RESTRICT | The user who holds this membership. |
| `store_id` | UUID | No | — | NOT NULL, FK → stores.id RESTRICT | The store this membership grants access to. |
| `role_id` | UUID | No | — | NOT NULL, FK → roles.id RESTRICT | The role that defines this user's permissions at this store. |
| `status` | TEXT | No | `'INVITED'` | NOT NULL, CHECK IN ('ACTIVE', 'INVITED', 'SUSPENDED', 'REVOKED') | INVITED = invitation sent but not accepted. REVOKED = access permanently removed. |
| `invited_by_user_id` | UUID | Yes | NULL | FK → users.id SET NULL | The user who sent the invitation. Null for the initial owner. |
| `invited_at` | TIMESTAMPTZ | Yes | NULL | — | UTC timestamp when the invitation was sent. |
| `accepted_at` | TIMESTAMPTZ | Yes | NULL | — | UTC timestamp when the user accepted the invitation. |
| `revoked_at` | TIMESTAMPTZ | Yes | NULL | — | UTC timestamp when access was revoked. |
| `created_at` | TIMESTAMPTZ | No | `now()` | NOT NULL | UTC timestamp of record creation. |
| `updated_at` | TIMESTAMPTZ | No | `now()` | NOT NULL | UTC timestamp of last modification. |

---

# Refresh Tokens

**Purpose**
Persists the hash of every issued refresh token so `POST /auth/refresh` can validate, rotate, and revoke sessions, per API_SPEC.md's Refresh Token Strategy. A row is never physically deleted on rotation — `revoked_at` is set instead — because the documented replay-attack defense ("if a refresh token is used twice, the server detects the reuse... and invalidates the entire session") requires the prior token's record to still exist to be recognized as already-rotated. The raw token is never stored, only its hash.

**Table name:** `refresh_tokens`

**Primary Key:** `id UUID`

**Unique Constraints**
- `token_hash` — the hash of a given raw refresh token is globally unique.

**Foreign Keys**
- `user_id → users.id` (CASCADE on delete — session artifacts have no meaning without their owner)

**Indexes**
- Primary key on `id` (automatic).
- Unique index on `token_hash` (lookup on every refresh call).
- Index on `user_id` (revoke-all-sessions on logout, password reset, and reuse detection).

| Column | Type | Nullable | Default | Constraints | Explanation |
|---|---|---|---|---|---|
| `id` | UUID | No | `gen_random_uuid()` | PK | Unique identifier. |
| `user_id` | UUID | No | — | NOT NULL, FK → users.id CASCADE | The user this session belongs to. |
| `token_hash` | TEXT | No | — | NOT NULL, UNIQUE | Hash of the raw refresh token. The raw value is only ever held by the client. |
| `expires_at` | TIMESTAMPTZ | No | — | NOT NULL | 7 days from issuance, per API_SPEC.md's JWT Strategy. |
| `revoked_at` | TIMESTAMPTZ | Yes | NULL | — | Set when the token is rotated (refresh), logged out, or invalidated (password reset, reuse detected). NULL = still active. |
| `created_at` | TIMESTAMPTZ | No | `now()` | NOT NULL | UTC timestamp of issuance. |

---

# Password Reset Tokens

**Purpose**
Persists the hash of a password reset token issued by `POST /auth/forgot-password`, so `POST /auth/reset-password` can validate it, per API_SPEC.md's Password Reset Flow. Only one active (non-revoked, non-expired) token may exist per user at a time — requesting a new one invalidates the previous.

**Table name:** `password_reset_tokens`

**Primary Key:** `id UUID`

**Unique Constraints**
- `token_hash` — the hash of a given raw reset token is globally unique.
- `user_id` WHERE `revoked_at IS NULL` — at most one active reset token per user. (Partial index — see Database Rules.)

**Foreign Keys**
- `user_id → users.id` (CASCADE on delete)

**Indexes**
- Primary key on `id` (automatic).
- Unique index on `token_hash` (lookup on reset).
- Partial unique index on `user_id` WHERE `revoked_at IS NULL` (enforces "one active token per user").

| Column | Type | Nullable | Default | Constraints | Explanation |
|---|---|---|---|---|---|
| `id` | UUID | No | `gen_random_uuid()` | PK | Unique identifier. |
| `user_id` | UUID | No | — | NOT NULL, FK → users.id CASCADE | The user requesting the reset. |
| `token_hash` | TEXT | No | — | NOT NULL, UNIQUE | Hash of the raw reset token emailed to the user. |
| `expires_at` | TIMESTAMPTZ | No | — | NOT NULL | 60 minutes from issuance, per API_SPEC.md's Password Reset Flow. |
| `revoked_at` | TIMESTAMPTZ | Yes | NULL | — | Set when the token is used, or superseded by a newer reset request. NULL = still active. |
| `created_at` | TIMESTAMPTZ | No | `now()` | NOT NULL | UTC timestamp of issuance. |

---

# Invitation Tokens

**Purpose**
Persists the hash of a team invitation token issued by `POST /stores/:storeId/team/invite`, so `POST /auth/accept-invitation` can validate it, per API_SPEC.md's Invitation Flow. Only one active (non-revoked, non-expired) token may exist per Membership at a time — re-inviting re-issues the token.

**Table name:** `invitation_tokens`

**Primary Key:** `id UUID`

**Unique Constraints**
- `token_hash` — the hash of a given raw invitation token is globally unique.
- `membership_id` WHERE `revoked_at IS NULL` — at most one active invitation token per Membership. (Partial index — see Database Rules.)

**Foreign Keys**
- `membership_id → memberships.id` (CASCADE on delete)

**Indexes**
- Primary key on `id` (automatic).
- Unique index on `token_hash` (lookup on accept).
- Partial unique index on `membership_id` WHERE `revoked_at IS NULL` (enforces "one active token per membership").

| Column | Type | Nullable | Default | Constraints | Explanation |
|---|---|---|---|---|---|
| `id` | UUID | No | `gen_random_uuid()` | PK | Unique identifier. |
| `membership_id` | UUID | No | — | NOT NULL, FK → memberships.id CASCADE | The membership this invitation activates. |
| `token_hash` | TEXT | No | — | NOT NULL, UNIQUE | Hash of the raw invitation token emailed to the invitee. |
| `expires_at` | TIMESTAMPTZ | No | — | NOT NULL | 72 hours from issuance, per API_SPEC.md's Invitation Flow. |
| `revoked_at` | TIMESTAMPTZ | Yes | NULL | — | Set when the token is accepted, or superseded by a re-invite. NULL = still active. |
| `created_at` | TIMESTAMPTZ | No | `now()` | NOT NULL | UTC timestamp of issuance. |

---

# Customers

**Purpose**
A Customer is a person who has placed at least one Order at a Store. Customers are always scoped to a Store — the same physical person placing orders at two different stores appears as two separate Customer records. Customers are the subjects of CRM, segmentation, and loyalty features. They are never Users.

**Table name:** `customers`

**Primary Key:** `id UUID`

**Unique Constraints**
- `(store_id, phone)` — a phone number uniquely identifies a customer within a store. This is the primary lookup key in restaurant operations.

**Foreign Keys**
- `store_id → stores.id` (RESTRICT on delete)

**Indexes**
- Primary key on `id` (automatic).
- Unique index on `(store_id, phone)` — primary lookup path.
- Index on `(store_id, last_order_at DESC)` — CRM queries for recent customers.
- Index on `(store_id, total_spent DESC)` — CRM queries for top spenders.
- Index on `(store_id, status)` — filter blocked customers.

| Column | Type | Nullable | Default | Constraints | Explanation |
|---|---|---|---|---|---|
| `id` | UUID | No | `gen_random_uuid()` | PK | Unique identifier. |
| `store_id` | UUID | No | — | NOT NULL, FK → stores.id RESTRICT | The store this customer belongs to. A customer at Store A is a different record than the same person at Store B. |
| `name` | TEXT | No | — | NOT NULL | Customer's full name. |
| `phone` | TEXT | No | — | NOT NULL | Primary identifier. Used for order lookup, WhatsApp notifications, and CRM. Unique per store. |
| `email` | TEXT | Yes | NULL | — | Optional email address for digital receipts or future campaigns. |
| `tax_id` | TEXT | Yes | NULL | — | CPF (Brazilian individual taxpayer number). Required when generating fiscal invoices. |
| `notes` | TEXT | Yes | NULL | — | Internal operator notes. Visible only to staff (e.g., "allergic to shellfish", "VIP customer"). |
| `status` | TEXT | No | `'ACTIVE'` | NOT NULL, CHECK IN ('ACTIVE', 'BLOCKED') | BLOCKED customers cannot place new orders and are flagged in the ordering interface. |
| `first_order_at` | TIMESTAMPTZ | Yes | NULL | — | UTC timestamp of the customer's first completed order. Updated by the service layer on order completion. |
| `last_order_at` | TIMESTAMPTZ | Yes | NULL | — | UTC timestamp of the customer's most recent completed order. Denormalized for CRM performance. |
| `total_orders` | INTEGER | No | `0` | NOT NULL, CHECK >= 0 | Denormalized count of completed orders. Maintained by the service layer. Never decremented on cancellation. |
| `total_spent` | INTEGER | No | `0` | NOT NULL, CHECK >= 0 | Denormalized sum of grand totals from completed orders in cents. Maintained by the service layer. |
| `created_at` | TIMESTAMPTZ | No | `now()` | NOT NULL | UTC timestamp of record creation. |
| `updated_at` | TIMESTAMPTZ | No | `now()` | NOT NULL | UTC timestamp of last modification. |

> **Design note — Denormalized aggregates:** `total_orders` and `total_spent` are denormalized counters. They are updated atomically by the service layer when an Order reaches the DELIVERED status. This avoids expensive COUNT and SUM queries on the orders table for every CRM list view. If they ever drift from the real totals, a reconciliation job can recalculate them from the orders table.

---

# Addresses

**Purpose**
A saved delivery address for a Customer. Customers may have multiple addresses (home, work, other). When an Order is placed, the selected address is copied as a JSONB snapshot into the Order — future changes to this Address record do not affect historical orders.

**Table name:** `addresses`

**Primary Key:** `id UUID`

**Unique Constraints**
- `(customer_id, label)` where `label IN ('HOME', 'WORK')` — a customer may have only one home and one work address. (Enforced at application level; multiple OTHER addresses are allowed.)

**Foreign Keys**
- `customer_id → customers.id` (CASCADE on delete — addresses are destroyed with the customer)

**Indexes**
- Primary key on `id` (automatic).
- Index on `customer_id` (list all addresses for a customer).
- Partial index on `(customer_id, is_default)` WHERE `is_default = true` (fast default address lookup).

**Soft Delete:** `deleted_at` — customers may remove addresses from their address book without losing the historical snapshot embedded in Orders.

| Column | Type | Nullable | Default | Constraints | Explanation |
|---|---|---|---|---|---|
| `id` | UUID | No | `gen_random_uuid()` | PK | Unique identifier. |
| `customer_id` | UUID | No | — | NOT NULL, FK → customers.id CASCADE | The customer who owns this address. |
| `label` | TEXT | No | `'OTHER'` | NOT NULL, CHECK IN ('HOME', 'WORK', 'OTHER') | User-defined label for quick identification. |
| `street` | TEXT | No | — | NOT NULL | Street name. |
| `number` | TEXT | No | — | NOT NULL | Building or house number. |
| `complement` | TEXT | Yes | NULL | — | Apartment, suite, floor, or other qualifier. |
| `neighborhood` | TEXT | No | — | NOT NULL | Neighborhood or district. Required for delivery routing in Brazil. |
| `city` | TEXT | No | — | NOT NULL | City name. |
| `state` | TEXT | No | — | NOT NULL, LENGTH = 2 | ISO 3166-2 subdivision code (e.g., "SP", "RJ"). |
| `postal_code` | TEXT | No | — | NOT NULL | CEP or postal code. |
| `country` | TEXT | No | `'BR'` | NOT NULL, LENGTH = 2 | ISO 3166-1 alpha-2 code. |
| `latitude` | NUMERIC(10,7) | Yes | NULL | — | GPS coordinate for map integrations. |
| `longitude` | NUMERIC(10,7) | Yes | NULL | — | GPS coordinate for map integrations. |
| `is_default` | BOOLEAN | No | `false` | NOT NULL | At most one address per customer should have is_default = true. Enforced at application level. |
| `deleted_at` | TIMESTAMPTZ | Yes | NULL | — | Soft delete timestamp. Non-null = logically deleted. Historical order snapshots are unaffected. |
| `created_at` | TIMESTAMPTZ | No | `now()` | NOT NULL | UTC timestamp of record creation. |
| `updated_at` | TIMESTAMPTZ | No | `now()` | NOT NULL | UTC timestamp of last modification. |

---

# Categories

**Purpose**
A Category groups related Products within a Store's catalog. Categories have no operational role — they exist purely for organization and display. A Category cannot be deleted while it has at least one active Product assigned to it.

**Table name:** `categories`

**Primary Key:** `id UUID`

**Unique Constraints**
- `(store_id, name)` — a store cannot have two categories with the same name.

**Foreign Keys**
- `store_id → stores.id` (RESTRICT on delete)

**Indexes**
- Primary key on `id` (automatic).
- Index on `(store_id, sort_order)` — ordered category list.
- Index on `(store_id, is_active)` — filter active categories.
- Unique index on `(store_id, name)`.

**Soft Delete:** `deleted_at` — categories are soft-deleted to preserve referential integrity with Products that may still reference them (out-of-stock or inactive products).

| Column | Type | Nullable | Default | Constraints | Explanation |
|---|---|---|---|---|---|
| `id` | UUID | No | `gen_random_uuid()` | PK | Unique identifier. |
| `store_id` | UUID | No | — | NOT NULL, FK → stores.id RESTRICT | The store this category belongs to. |
| `name` | TEXT | No | — | NOT NULL | Display name (e.g., "Pizzas", "Bebidas", "Sobremesas"). Unique per store. |
| `description` | TEXT | Yes | NULL | — | Optional description shown in management interface. |
| `image_url` | TEXT | Yes | NULL | — | URL of the category image. |
| `sort_order` | INTEGER | No | `0` | NOT NULL, CHECK >= 0 | Manual display ordering. Lower values appear first. |
| `is_active` | BOOLEAN | No | `true` | NOT NULL | Inactive categories are hidden from menus and the ordering interface. |
| `deleted_at` | TIMESTAMPTZ | Yes | NULL | — | Soft delete timestamp. A category with active products cannot be soft-deleted. |
| `created_at` | TIMESTAMPTZ | No | `now()` | NOT NULL | UTC timestamp of record creation. |
| `updated_at` | TIMESTAMPTZ | No | `now()` | NOT NULL | UTC timestamp of last modification. |

---

# Products

**Purpose**
A Product is a sellable item offered by a Store. Products are the items that appear on menus, are added to Orders, and drive all revenue. Products are never hardcoded — all products are managed through the catalog. Deleted products are soft-deleted so that historical Order Items remain intact.

**Table name:** `products`

**Primary Key:** `id UUID`

**Unique Constraints**
- `(store_id, sku)` WHERE `sku IS NOT NULL` — SKUs are unique within a store when provided.

**Foreign Keys**
- `store_id → stores.id` (RESTRICT on delete)
- `category_id → categories.id` (RESTRICT on delete — prevents deleting a category with active products)

**Indexes**
- Primary key on `id` (automatic).
- Index on `(store_id, category_id, sort_order)` — ordered products within a category.
- Index on `(store_id, status)` — filter by status.
- Partial index on `(store_id, status, is_available)` WHERE `deleted_at IS NULL` — available products for the ordering interface.
- Index on `(store_id, sku)` WHERE `sku IS NOT NULL` — SKU lookup.

**Soft Delete:** `deleted_at` — products are soft-deleted rather than physically removed. Order Items that reference a soft-deleted product retain their snapshot data; the `product_id` reference becomes a historical pointer.

| Column | Type | Nullable | Default | Constraints | Explanation |
|---|---|---|---|---|---|
| `id` | UUID | No | `gen_random_uuid()` | PK | Unique identifier. |
| `store_id` | UUID | No | — | NOT NULL, FK → stores.id RESTRICT | The store that owns this product. |
| `category_id` | UUID | No | — | NOT NULL, FK → categories.id RESTRICT | The category this product is grouped under. |
| `name` | TEXT | No | — | NOT NULL | Display name shown on menus and order screens. |
| `description` | TEXT | Yes | NULL | — | Optional longer description shown on product detail. |
| `price` | INTEGER | No | — | NOT NULL, CHECK >= 0 | Base price in cents. The final price may be higher after modifier adjustments. |
| `image_url` | TEXT | Yes | NULL | — | URL of the product image. |
| `sku` | TEXT | Yes | NULL | — | Optional internal stock-keeping code. Used by the future Inventory module. |
| `type` | TEXT | No | `'SIMPLE'` | NOT NULL, CHECK IN ('SIMPLE', 'COMBO', 'SERVICE_CHARGE') | SIMPLE = standard item. COMBO = future bundle type. SERVICE_CHARGE = non-physical line item (e.g., delivery fee). |
| `status` | TEXT | No | `'ACTIVE'` | NOT NULL, CHECK IN ('ACTIVE', 'INACTIVE', 'OUT_OF_STOCK') | OUT_OF_STOCK blocks addition to new orders. INACTIVE hides the product entirely. |
| `is_available` | BOOLEAN | No | `true` | NOT NULL | Computed and denormalized field: true when status = ACTIVE and the current time falls within availability_schedule (or schedule is null). Updated by a scheduled job or real-time check. |
| `availability_schedule` | JSONB | Yes | NULL | — | Optional WeeklySchedule object. When null, the product is available at all times the store is open. Format: { monday: { isOpen, slots: [{open, close}] }, … }. |
| `sort_order` | INTEGER | No | `0` | NOT NULL, CHECK >= 0 | Manual display ordering within the category. Lower values appear first. |
| `deleted_at` | TIMESTAMPTZ | Yes | NULL | — | Soft delete timestamp. Non-null = product is logically deleted. Existing Order Items that reference this product are unaffected. |
| `created_at` | TIMESTAMPTZ | No | `now()` | NOT NULL | UTC timestamp of record creation. |
| `updated_at` | TIMESTAMPTZ | No | `now()` | NOT NULL | UTC timestamp of last modification. |

---

# Modifier Groups

**Purpose**
A Modifier Group defines a customization dimension for a Product. Examples: "Choose your size", "Extra toppings", "Cooking preference". It carries validation rules (minimum and maximum selections) enforced at order creation time. A required group with unsatisfied selections blocks order placement.

**Table name:** `modifier_groups`

**Primary Key:** `id UUID`

**Unique Constraints**
- `(product_id, name)` — a product cannot have two modifier groups with the same name.

**Foreign Keys**
- `store_id → stores.id` (RESTRICT on delete)
- `product_id → products.id` (CASCADE on delete — modifier groups are destroyed with their product)

**Indexes**
- Primary key on `id` (automatic).
- Index on `(product_id, sort_order)` — ordered groups for a product.
- Index on `store_id` — operational queries scoped to a store.

**Soft Delete:** `deleted_at` — soft-deleted modifier groups are hidden from new orders. Historical Order Items that snapshotted selections from this group are unaffected.

| Column | Type | Nullable | Default | Constraints | Explanation |
|---|---|---|---|---|---|
| `id` | UUID | No | `gen_random_uuid()` | PK | Unique identifier. |
| `store_id` | UUID | No | — | NOT NULL, FK → stores.id RESTRICT | Redundant store scope for multi-tenancy enforcement and query performance. |
| `product_id` | UUID | No | — | NOT NULL, FK → products.id CASCADE | The product this group customizes. |
| `name` | TEXT | No | — | NOT NULL | Display name (e.g., "Escolha o tamanho", "Adicionais"). Unique per product. |
| `description` | TEXT | Yes | NULL | — | Optional hint text shown to the customer below the group name. |
| `is_required` | BOOLEAN | No | `false` | NOT NULL | When true, the customer must select at least min_selections options before placing the order. |
| `min_selections` | INTEGER | No | `0` | NOT NULL, CHECK >= 0 | Minimum number of modifiers that must be chosen. 0 = the group is optional. Must be ≤ max_selections. |
| `max_selections` | INTEGER | No | `1` | NOT NULL, CHECK >= 1 | Maximum number of modifiers that may be chosen. 1 = single-choice (radio). >1 = multi-select (checkbox). |
| `sort_order` | INTEGER | No | `0` | NOT NULL, CHECK >= 0 | Display ordering among this product's modifier groups. |
| `is_active` | BOOLEAN | No | `true` | NOT NULL | Inactive groups are hidden from the ordering interface. |
| `deleted_at` | TIMESTAMPTZ | Yes | NULL | — | Soft delete timestamp. |
| `created_at` | TIMESTAMPTZ | No | `now()` | NOT NULL | UTC timestamp of record creation. |
| `updated_at` | TIMESTAMPTZ | No | `now()` | NOT NULL | UTC timestamp of last modification. |

---

# Modifiers

**Purpose**
A Modifier is a single selectable option within a Modifier Group. Examples: "Grande", "Borda recheada", "Ao ponto". Modifiers can carry an additional price. When a customer selects a Modifier, its name and price are snapshotted into the Order Item — future changes do not affect historical orders.

**Table name:** `modifiers`

**Primary Key:** `id UUID`

**Unique Constraints**
- `(modifier_group_id, name)` — a modifier group cannot have two options with the same name.

**Foreign Keys**
- `store_id → stores.id` (RESTRICT on delete)
- `modifier_group_id → modifier_groups.id` (CASCADE on delete — modifiers are destroyed with their group)

**Indexes**
- Primary key on `id` (automatic).
- Index on `(modifier_group_id, sort_order)` — ordered modifiers for a group.

**Soft Delete:** `deleted_at` — modifiers are soft-deleted to preserve Order history. Deleted modifiers remain in historical snapshots.

| Column | Type | Nullable | Default | Constraints | Explanation |
|---|---|---|---|---|---|
| `id` | UUID | No | `gen_random_uuid()` | PK | Unique identifier. |
| `store_id` | UUID | No | — | NOT NULL, FK → stores.id RESTRICT | Redundant store scope for multi-tenancy enforcement. |
| `modifier_group_id` | UUID | No | — | NOT NULL, FK → modifier_groups.id CASCADE | The group this modifier option belongs to. |
| `name` | TEXT | No | — | NOT NULL | Display name (e.g., "Grande", "Borda Recheada"). Unique per modifier group. |
| `price_adjustment` | INTEGER | No | `0` | NOT NULL | Additional cost in cents added to the Order Item when selected. 0 = no extra cost. Positive = surcharge. Negative = discount (combo pricing). |
| `sku` | TEXT | Yes | NULL | — | Optional internal code for inventory integration. |
| `sort_order` | INTEGER | No | `0` | NOT NULL, CHECK >= 0 | Display ordering within the modifier group. |
| `is_active` | BOOLEAN | No | `true` | NOT NULL | Inactive modifiers are hidden from the ordering interface. |
| `deleted_at` | TIMESTAMPTZ | Yes | NULL | — | Soft delete timestamp. |
| `created_at` | TIMESTAMPTZ | No | `now()` | NOT NULL | UTC timestamp of record creation. |
| `updated_at` | TIMESTAMPTZ | No | `now()` | NOT NULL | UTC timestamp of last modification. |

---

# Menus

**Purpose**
A Menu is a curated, channel-specific, time-bound view of a Store's catalog. A Store may have multiple Menus — a lunch menu, a delivery menu, a weekend special menu. The Menu is the published artifact that ordering channels consume. Changes to the Menu do not alter Products or Categories.

**Table name:** `menus`

**Primary Key:** `id UUID`

**Unique Constraints**
- `(store_id, name)` — a store cannot have two menus with the same name.

**Foreign Keys**
- `store_id → stores.id` (RESTRICT on delete)

**Indexes**
- Primary key on `id` (automatic).
- Index on `(store_id, status, channel)` — active menu lookup for a specific channel.

| Column | Type | Nullable | Default | Constraints | Explanation |
|---|---|---|---|---|---|
| `id` | UUID | No | `gen_random_uuid()` | PK | Unique identifier. |
| `store_id` | UUID | No | — | NOT NULL, FK → stores.id RESTRICT | The store this menu belongs to. |
| `name` | TEXT | No | — | NOT NULL | Display name (e.g., "Cardápio Delivery", "Cardápio Almoço"). |
| `description` | TEXT | Yes | NULL | — | Optional description for internal management use. |
| `status` | TEXT | No | `'INACTIVE'` | NOT NULL, CHECK IN ('ACTIVE', 'INACTIVE', 'SCHEDULED') | Only ACTIVE menus are served to ordering channels. SCHEDULED menus become active at a configured time (future). |
| `channel` | TEXT | No | `'DELIVERY'` | NOT NULL, CHECK IN ('DELIVERY', 'IN_STORE', 'MARKETPLACE', 'KIOSK') | The ordering channel this menu is published to. |
| `availability_schedule` | JSONB | Yes | NULL | — | Optional time-based availability. When null, the menu is active at all store operating hours. Format: { monday: { isOpen, slots: [{open, close}] }, … }. |
| `created_at` | TIMESTAMPTZ | No | `now()` | NOT NULL | UTC timestamp of record creation. |
| `updated_at` | TIMESTAMPTZ | No | `now()` | NOT NULL | UTC timestamp of last modification. |

---

# Menu Sections

**Purpose**
The join between a Menu and its Categories. A Menu Section defines which categories appear in a Menu, in what order, and whether they are visible. This allows the display order of categories to differ between menus without modifying the Category records themselves.

**Table name:** `menu_sections`

**Primary Key:** `id UUID`

**Unique Constraints**
- `(menu_id, category_id)` — a category can appear at most once per menu.

**Foreign Keys**
- `menu_id → menus.id` (CASCADE on delete — sections are destroyed with the menu)
- `category_id → categories.id` (RESTRICT on delete — prevents deleting a category used in a menu)

**Indexes**
- Primary key on `id` (automatic).
- Index on `(menu_id, sort_order)` — ordered sections for a menu.
- Unique index on `(menu_id, category_id)`.

| Column | Type | Nullable | Default | Constraints | Explanation |
|---|---|---|---|---|---|
| `id` | UUID | No | `gen_random_uuid()` | PK | Unique identifier. |
| `menu_id` | UUID | No | — | NOT NULL, FK → menus.id CASCADE | The menu this section belongs to. |
| `category_id` | UUID | No | — | NOT NULL, FK → categories.id RESTRICT | The category being included in this menu. |
| `sort_order` | INTEGER | No | `0` | NOT NULL, CHECK >= 0 | Display order of this category within the menu. Independent of the category's own sort_order. |
| `is_visible` | BOOLEAN | No | `true` | NOT NULL | When false, the category is included in the menu definition but hidden from the customer view. Useful for temporarily hiding a section without removing it. |

> **Design note — No timestamps on menu_sections:** This is a pure join table with only configuration attributes. It has no independent lifecycle — it is created and destroyed with the menu. Timestamps add noise without value here.

---

# Orders

**Purpose**
The central entity of MarginFlow. Every business transaction starts as an Order. The Order records what was requested, by whom, from where, and how it will be fulfilled. The Order is the origin of every other operational record — Kitchen Ticket, Payment, Delivery, and Invoice all exist because of an Order.

**Table name:** `orders`

**Primary Key:** `id UUID`

**Unique Constraints**
- `(store_id, number)` — order numbers are sequential per store. #4821 at Store A and #4821 at Store B are different orders.

**Foreign Keys**
- `store_id → stores.id` (RESTRICT on delete)
- `customer_id → customers.id` (SET NULL on delete — anonymous orders are allowed)
- `cancelled_by_user_id → users.id` (SET NULL on delete)

**Indexes**
- Primary key on `id` (automatic).
- Unique index on `(store_id, number)` — human-readable order lookup.
- Index on `(store_id, status)` — filter orders by status (active order management).
- Index on `(store_id, created_at DESC)` — order history, newest first.
- Index on `(store_id, type, status)` — filter by fulfillment type and status.
- Index on `(store_id, customer_id)` — all orders for a customer within a store.
- Index on `(customer_id, created_at DESC)` — cross-store customer order history.
- Index on `(store_id, channel)` — filter by sales channel.
- Index on `(store_id, scheduled_for)` WHERE `scheduled_for IS NOT NULL` — scheduled order queue.

| Column | Type | Nullable | Default | Constraints | Explanation |
|---|---|---|---|---|---|
| `id` | UUID | No | `gen_random_uuid()` | PK | Unique identifier. |
| `store_id` | UUID | No | — | NOT NULL, FK → stores.id RESTRICT | The store that received this order. |
| `customer_id` | UUID | Yes | NULL | FK → customers.id SET NULL | Null for anonymous walk-in orders. When non-null, enables CRM and loyalty features. |
| `number` | INTEGER | No | — | NOT NULL, CHECK > 0 | Human-readable sequential number per store (e.g., 4821). Displayed as "#4821" in the UI. Generated by the service layer using an advisory lock. |
| `status` | TEXT | No | `'DRAFT'` | NOT NULL, CHECK IN ('DRAFT', 'PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED') | Current lifecycle status. Transitions are one-directional. Full history is in order_status_transitions. |
| `type` | TEXT | No | — | NOT NULL, CHECK IN ('DELIVERY', 'TAKEAWAY', 'DINE_IN') | Fulfillment method. Determines whether a Delivery record is created and whether a delivery address is required. |
| `channel` | TEXT | No | — | NOT NULL, CHECK IN ('IN_STORE', 'PHONE', 'MARKETPLACE', 'WHATSAPP', 'KIOSK') | Sales channel through which the order entered the system. |
| `table_number` | TEXT | Yes | NULL | — | Dine-in table identifier. Only meaningful when type = DINE_IN. |
| `delivery_address` | JSONB | Yes | NULL | — | Immutable address snapshot captured at order placement. Null for DINE_IN and TAKEAWAY orders. Format: { street, number, complement, neighborhood, city, state, postalCode, country, latitude, longitude }. |
| `items_total` | INTEGER | No | `0` | NOT NULL, CHECK >= 0 | Sum of all Order Item subtotals in cents. |
| `discount_total` | INTEGER | No | `0` | NOT NULL, CHECK >= 0 | Total discounts applied to the order in cents. |
| `delivery_fee` | INTEGER | No | `0` | NOT NULL, CHECK >= 0 | Delivery fee in cents. Always 0 for non-delivery orders. |
| `grand_total` | INTEGER | No | `0` | NOT NULL, CHECK >= 0 | Final charged amount: items_total − discount_total + delivery_fee. Immutable after the order reaches CONFIRMED status. |
| `notes` | TEXT | Yes | NULL | — | Order-level customer instructions (e.g., "no onions", "leave at the door"). |
| `scheduled_for` | TIMESTAMPTZ | Yes | NULL | — | Target delivery/pickup time for scheduled orders. Null = immediate order. The order cannot be confirmed before this time. |
| `cancelled_reason` | TEXT | Yes | NULL | — | Mandatory when status = CANCELLED. A non-null status = CANCELLED with a null cancelled_reason is a data integrity violation. |
| `cancelled_by_user_id` | UUID | Yes | NULL | FK → users.id SET NULL | The user who cancelled the order. Mandatory when status = CANCELLED. |
| `confirmed_at` | TIMESTAMPTZ | Yes | NULL | — | UTC timestamp when the order reached CONFIRMED status. |
| `ready_at` | TIMESTAMPTZ | Yes | NULL | — | UTC timestamp when the order reached READY status. |
| `delivered_at` | TIMESTAMPTZ | Yes | NULL | — | UTC timestamp when the order reached DELIVERED status. |
| `cancelled_at` | TIMESTAMPTZ | Yes | NULL | — | UTC timestamp when the order reached CANCELLED status. |
| `created_at` | TIMESTAMPTZ | No | `now()` | NOT NULL | UTC timestamp of order creation (Draft). |
| `updated_at` | TIMESTAMPTZ | No | `now()` | NOT NULL | UTC timestamp of last modification. |

> **Design note — Denormalized status timestamps:** `confirmed_at`, `ready_at`, `delivered_at`, and `cancelled_at` are denormalized from the `order_status_transitions` table. They exist on the orders table for query performance — computing average delivery time, kitchen throughput, and daily sales reports does not require joining `order_status_transitions` for every row. The canonical history remains in `order_status_transitions`.

> **Design note — delivery_address as JSONB:** The delivery address is stored as a JSONB snapshot, not as a foreign key to the `addresses` table. This is deliberate — the address at the time of order placement is immutable. If the customer later updates or deletes their address, historical orders are unaffected. This is a core business rule, not a technical convenience.

---

# Order Items

**Purpose**
A single line item within an Order. Represents one Product in a specific quantity, with specific Modifier selections, at a price frozen at the time of order placement. All product data is snapshotted — no live reference to the catalog is required to reconstruct an Order.

**Table name:** `order_items`

**Primary Key:** `id UUID`

**Unique Constraints**
- None beyond the primary key. Multiple items for the same product are allowed (different modifier selections create separate line items).

**Foreign Keys**
- `order_id → orders.id` (CASCADE on delete — items are destroyed with the order. In practice, orders are never deleted; this is a safety constraint.)
- `product_id → products.id` (SET NULL on delete — when a product is soft-deleted, the reference becomes null but the snapshot data is preserved)

**Indexes**
- Primary key on `id` (automatic).
- Index on `order_id` — retrieve all items for an order.
- Index on `product_id` WHERE `product_id IS NOT NULL` — find historical orders containing a product.

| Column | Type | Nullable | Default | Constraints | Explanation |
|---|---|---|---|---|---|
| `id` | UUID | No | `gen_random_uuid()` | PK | Unique identifier. |
| `order_id` | UUID | No | — | NOT NULL, FK → orders.id CASCADE | The parent order. |
| `product_id` | UUID | Yes | NULL | FK → products.id SET NULL | Soft reference to the live catalog. Null when the product has been soft-deleted. The snapshot columns below always hold the truth. |
| `product_name` | TEXT | No | — | NOT NULL | Snapshot of the product name at the time of order placement. |
| `product_price` | INTEGER | No | — | NOT NULL, CHECK >= 0 | Snapshot of the product base price at order placement, in cents. |
| `quantity` | INTEGER | No | — | NOT NULL, CHECK > 0 | Number of units ordered. |
| `selected_modifiers` | JSONB | No | `'[]'` | NOT NULL | Snapshot array of chosen modifiers. Format: [{ modifierId, modifierGroupId, name, priceAdjustment }]. Empty array when no modifiers were selected. |
| `unit_total` | INTEGER | No | — | NOT NULL, CHECK >= 0 | product_price + sum of all selected modifier price_adjustments, in cents. |
| `subtotal` | INTEGER | No | — | NOT NULL, CHECK >= 0 | unit_total × quantity, in cents. |
| `notes` | TEXT | Yes | NULL | — | Item-level customer instructions (e.g., "extra spicy", "no pickles"). |
| `status` | TEXT | No | `'PENDING'` | NOT NULL, CHECK IN ('PENDING', 'PREPARING', 'READY', 'CANCELLED') | Item-level kitchen status. An item may be cancelled individually without cancelling the whole order (future feature). |
| `created_at` | TIMESTAMPTZ | No | `now()` | NOT NULL | UTC timestamp of record creation. |
| `updated_at` | TIMESTAMPTZ | No | `now()` | NOT NULL | UTC timestamp of last modification. |

---

# Order Status Transitions

**Purpose**
An append-only audit log of every status change an Order goes through. This table is the canonical history of the Order lifecycle. Rows are never updated or deleted. The `status` field on the `orders` table is a denormalized copy of the most recent transition for query performance.

**Table name:** `order_status_transitions`

**Primary Key:** `id UUID`

**Unique Constraints**
- None. Multiple transitions to the same status are prevented by application logic (e.g., Cancelled → Cancelled), not by a database constraint.

**Foreign Keys**
- `order_id → orders.id` (CASCADE on delete)
- `triggered_by_user_id → users.id` (SET NULL on delete)

**Indexes**
- Primary key on `id` (automatic).
- Index on `(order_id, occurred_at DESC)` — retrieve full lifecycle history for an order, newest first.

> **No `updated_at`:** This table is append-only. Rows are never modified. There is nothing to track as "last updated."

| Column | Type | Nullable | Default | Constraints | Explanation |
|---|---|---|---|---|---|
| `id` | UUID | No | `gen_random_uuid()` | PK | Unique identifier. |
| `order_id` | UUID | No | — | NOT NULL, FK → orders.id CASCADE | The order whose status changed. |
| `status` | TEXT | No | — | NOT NULL, CHECK IN ('DRAFT', 'PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED') | The status the order transitioned TO. |
| `triggered_by_user_id` | UUID | Yes | NULL | FK → users.id SET NULL | The user who triggered the transition. Null for system-automated transitions (e.g., auto-confirm, scheduled delivery). |
| `notes` | TEXT | Yes | NULL | — | Optional context for the transition (e.g., "Customer called to cancel", "Auto-confirmed by settings"). |
| `occurred_at` | TIMESTAMPTZ | No | `now()` | NOT NULL | UTC timestamp of the transition. This is the authoritative time — not `created_at`. |

---

# Kitchen Tickets

**Purpose**
The production document sent to the kitchen when an Order is confirmed. Kitchen staff operate exclusively through Tickets — they never see the full Order entity. This separation allows the Kitchen module to evolve independently from the Orders module. A Kitchen Ticket is created automatically and atomically when an Order reaches the CONFIRMED status.

**Table name:** `kitchen_tickets`

**Primary Key:** `id UUID`

**Unique Constraints**
- `order_id` — one Kitchen Ticket per Order.

**Foreign Keys**
- `order_id → orders.id` (RESTRICT on delete)
- `store_id → stores.id` (RESTRICT on delete)

**Indexes**
- Primary key on `id` (automatic).
- Unique index on `order_id` (one ticket per order; fast lookup).
- Index on `(store_id, status)` — the active KDS queue (QUEUED and PREPARING tickets).
- Index on `(store_id, queued_at)` — time-ordered queue display.

| Column | Type | Nullable | Default | Constraints | Explanation |
|---|---|---|---|---|---|
| `id` | UUID | No | `gen_random_uuid()` | PK | Unique identifier. |
| `store_id` | UUID | No | — | NOT NULL, FK → stores.id RESTRICT | The store whose kitchen is handling this ticket. |
| `order_id` | UUID | No | — | NOT NULL, UNIQUE, FK → orders.id RESTRICT | The order this ticket represents. One-to-one. |
| `order_number` | INTEGER | No | — | NOT NULL | Denormalized order number. Copied at creation time so the kitchen display never needs to join the orders table. |
| `order_type` | TEXT | No | — | NOT NULL, CHECK IN ('DELIVERY', 'TAKEAWAY', 'DINE_IN') | Denormalized from the order. Determines the post-ready action: DELIVERY creates a Delivery record; TAKEAWAY notifies the cashier. |
| `status` | TEXT | No | `'QUEUED'` | NOT NULL, CHECK IN ('QUEUED', 'PREPARING', 'READY', 'CANCELLED') | Kitchen production status. One-directional: QUEUED → PREPARING → READY. |
| `notes` | TEXT | Yes | NULL | — | Order-level production notes copied from the order. |
| `queued_at` | TIMESTAMPTZ | No | `now()` | NOT NULL | UTC timestamp when the ticket entered the kitchen queue. Used for queue time reporting. |
| `started_at` | TIMESTAMPTZ | Yes | NULL | — | UTC timestamp when a kitchen attendant started preparation. |
| `ready_at` | TIMESTAMPTZ | Yes | NULL | — | UTC timestamp when the ticket was marked READY. Triggers Delivery creation for delivery orders. |
| `cancelled_at` | TIMESTAMPTZ | Yes | NULL | — | UTC timestamp when the ticket was cancelled due to order cancellation. |
| `created_at` | TIMESTAMPTZ | No | `now()` | NOT NULL | UTC timestamp of record creation. |
| `updated_at` | TIMESTAMPTZ | No | `now()` | NOT NULL | UTC timestamp of last modification. |

---

# Kitchen Items

**Purpose**
The individual production lines within a Kitchen Ticket. Derived from Order Items but shaped for kitchen display — they contain only what kitchen staff need: what to make, how many, what customizations, and any special instructions. No pricing data is present.

**Table name:** `kitchen_items`

**Primary Key:** `id UUID`

**Unique Constraints**
- None beyond the primary key.

**Foreign Keys**
- `ticket_id → kitchen_tickets.id` (CASCADE on delete — items are destroyed with the ticket)

**Indexes**
- Primary key on `id` (automatic).
- Index on `ticket_id` — retrieve all items for a ticket.

| Column | Type | Nullable | Default | Constraints | Explanation |
|---|---|---|---|---|---|
| `id` | UUID | No | `gen_random_uuid()` | PK | Unique identifier. |
| `ticket_id` | UUID | No | — | NOT NULL, FK → kitchen_tickets.id CASCADE | The kitchen ticket this item belongs to. |
| `product_name` | TEXT | No | — | NOT NULL | Product name as it appeared at order time. Copied from the Order Item snapshot. |
| `quantity` | INTEGER | No | — | NOT NULL, CHECK > 0 | Number of units to prepare. |
| `modifier_summary` | TEXT[] | No | `'{}'` | NOT NULL | Human-readable array of selected modifier names (e.g., '{Grande, Borda Recheada}'). Pre-formatted for the KDS display. |
| `notes` | TEXT | Yes | NULL | — | Item-level instructions from the customer. |
| `status` | TEXT | No | `'PENDING'` | NOT NULL, CHECK IN ('PENDING', 'PREPARING', 'READY', 'CANCELLED') | Item-level production status. Enables marking individual items as done within a ticket. |

> **No timestamps on kitchen_items:** Kitchen items are created and updated as part of their parent ticket's lifecycle. They do not have independent audit requirements. `updated_at` on `kitchen_tickets` covers the parent record.

---

# Payments

**Purpose**
The settled financial record for a completed Order. One Order has at most one active Payment record. The Payment is the source of truth for financial reconciliation. Multiple payment attempts (failed and successful) are tracked in the `payment_attempts` table. The Finance module reads from Payments — it never modifies them.

**Table name:** `payments`

**Primary Key:** `id UUID`

**Unique Constraints**
- `order_id` — one active Payment per Order.

**Foreign Keys**
- `order_id → orders.id` (RESTRICT on delete)
- `store_id → stores.id` (RESTRICT on delete)
- `refunded_by_user_id → users.id` (SET NULL on delete)
- `successful_attempt_id → payment_attempts.id` (SET NULL on delete)

**Indexes**
- Primary key on `id` (automatic).
- Unique index on `order_id` (one payment per order; fast lookup).
- Index on `(store_id, created_at DESC)` — financial list views and daily summaries.
- Index on `(store_id, status)` — filter by payment status.
- Index on `(store_id, paid_at DESC)` WHERE `paid_at IS NOT NULL` — completed payments for reconciliation.
- Index on `(store_id, method)` — filter by payment method for daily cash count.

| Column | Type | Nullable | Default | Constraints | Explanation |
|---|---|---|---|---|---|
| `id` | UUID | No | `gen_random_uuid()` | PK | Unique identifier. |
| `order_id` | UUID | No | — | NOT NULL, UNIQUE, FK → orders.id RESTRICT | The order this payment settles. One-to-one. |
| `store_id` | UUID | No | — | NOT NULL, FK → stores.id RESTRICT | Redundant store scope for multi-tenancy enforcement and financial reporting. |
| `amount` | INTEGER | No | — | NOT NULL, CHECK > 0 | Total amount charged to the customer, in cents. Must equal order.grand_total. Discrepancies are flagged for reconciliation. |
| `refunded_amount` | INTEGER | No | `0` | NOT NULL, CHECK >= 0 | Amount refunded in cents. 0 until a refund is initiated. |
| `status` | TEXT | No | `'PENDING'` | NOT NULL, CHECK IN ('PENDING', 'AUTHORIZED', 'PAID', 'REFUNDED', 'PARTIALLY_REFUNDED', 'FAILED') | Payment lifecycle status. |
| `method` | TEXT | No | — | NOT NULL, CHECK IN ('CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'PIX', 'VOUCHER', 'GIFT_CARD', 'ONLINE') | The payment instrument used by the customer. |
| `gateway` | TEXT | No | `'MANUAL'` | NOT NULL, CHECK IN ('MANUAL', 'STRIPE', 'PAGARME', 'MERCADO_PAGO', 'IUGU', 'ASAAS') | The payment processor. MANUAL = cash or in-person card with no gateway. |
| `gateway_transaction_id` | TEXT | Yes | NULL | — | External transaction reference from the gateway. Used for reconciliation and refund processing. |
| `successful_attempt_id` | UUID | Yes | NULL | FK → payment_attempts.id SET NULL | The payment attempt that resulted in this payment being settled. |
| `refunded_by_user_id` | UUID | Yes | NULL | FK → users.id SET NULL | The user who authorized the refund. Null until a refund is initiated. Requires manager or owner role. |
| `refund_reason` | TEXT | Yes | NULL | — | Mandatory when status = REFUNDED or PARTIALLY_REFUNDED. |
| `paid_at` | TIMESTAMPTZ | Yes | NULL | — | UTC timestamp when the payment reached PAID status. |
| `refunded_at` | TIMESTAMPTZ | Yes | NULL | — | UTC timestamp when the refund was processed. |
| `created_at` | TIMESTAMPTZ | No | `now()` | NOT NULL | UTC timestamp of record creation. |
| `updated_at` | TIMESTAMPTZ | No | `now()` | NOT NULL | UTC timestamp of last modification. |

---

# Payment Attempts

**Purpose**
A single attempt to process payment for an Order. An Order may have multiple failed Payment Attempts before a successful one (e.g., a declined card followed by a successful PIX payment). Payment Attempts are the audit trail of the payment processing pipeline. They are immutable once resolved.

**Table name:** `payment_attempts`

**Primary Key:** `id UUID`

**Unique Constraints**
- `gateway_transaction_id` WHERE `gateway_transaction_id IS NOT NULL` — a gateway transaction ID cannot be reused.

**Foreign Keys**
- `order_id → orders.id` (RESTRICT on delete)
- `store_id → stores.id` (RESTRICT on delete)

**Indexes**
- Primary key on `id` (automatic).
- Index on `order_id` — retrieve all attempts for an order.
- Index on `(store_id, attempted_at DESC)` — audit queries.

> **No `updated_at`:** Payment attempts are resolved atomically. `resolved_at` captures the moment of resolution. Once resolved, the record is never modified.

| Column | Type | Nullable | Default | Constraints | Explanation |
|---|---|---|---|---|---|
| `id` | UUID | No | `gen_random_uuid()` | PK | Unique identifier. |
| `order_id` | UUID | No | — | NOT NULL, FK → orders.id RESTRICT | The order this payment attempt is for. |
| `store_id` | UUID | No | — | NOT NULL, FK → stores.id RESTRICT | Store scope for multi-tenancy. |
| `amount` | INTEGER | No | — | NOT NULL, CHECK > 0 | Amount attempted, in cents. |
| `method` | TEXT | No | — | NOT NULL, CHECK IN ('CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'PIX', 'VOUCHER', 'GIFT_CARD', 'ONLINE') | Payment instrument attempted. |
| `gateway` | TEXT | No | — | NOT NULL, CHECK IN ('MANUAL', 'STRIPE', 'PAGARME', 'MERCADO_PAGO', 'IUGU', 'ASAAS') | The gateway used for this attempt. |
| `status` | TEXT | No | `'PENDING'` | NOT NULL, CHECK IN ('PENDING', 'AUTHORIZED', 'CAPTURED', 'DECLINED', 'FAILED', 'CANCELLED') | Outcome of this specific attempt. |
| `gateway_transaction_id` | TEXT | Yes | NULL | UNIQUE WHERE NOT NULL | External transaction reference. Used to match gateway webhooks to this attempt. |
| `gateway_response` | JSONB | Yes | NULL | — | Raw response payload from the payment gateway. Stored for audit and debugging. Never parsed by application logic after initial processing. |
| `failure_reason` | TEXT | Yes | NULL | — | Human-readable failure reason for declined or failed attempts (e.g., "Insufficient funds", "Card expired"). |
| `attempted_at` | TIMESTAMPTZ | No | `now()` | NOT NULL | UTC timestamp when the attempt was initiated. |
| `resolved_at` | TIMESTAMPTZ | Yes | NULL | — | UTC timestamp when the attempt reached a terminal status (CAPTURED, DECLINED, FAILED, CANCELLED). Null while PENDING or AUTHORIZED. |

---

# Deliveries

**Purpose**
Tracks the physical movement of an Order from the Store to the Customer. A Delivery record is created automatically when the corresponding Kitchen Ticket reaches READY status, but only for Orders of type DELIVERY. The Delivery domain is independent from production and payment.

**Table name:** `deliveries`

**Primary Key:** `id UUID`

**Unique Constraints**
- `order_id` — one Delivery per Order.

**Foreign Keys**
- `order_id → orders.id` (RESTRICT on delete)
- `store_id → stores.id` (RESTRICT on delete)

**Indexes**
- Primary key on `id` (automatic).
- Unique index on `order_id` (one delivery per order; fast lookup).
- Index on `(store_id, status)` — active deliveries view (AWAITING_PICKUP, DISPATCHED, IN_TRANSIT).
- Index on `(store_id, created_at DESC)` — delivery history.

| Column | Type | Nullable | Default | Constraints | Explanation |
|---|---|---|---|---|---|
| `id` | UUID | No | `gen_random_uuid()` | PK | Unique identifier. |
| `order_id` | UUID | No | — | NOT NULL, UNIQUE, FK → orders.id RESTRICT | The order being delivered. One-to-one. |
| `store_id` | UUID | No | — | NOT NULL, FK → stores.id RESTRICT | Store scope for multi-tenancy. |
| `status` | TEXT | No | `'AWAITING_PICKUP'` | NOT NULL, CHECK IN ('AWAITING_PICKUP', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'RETURNED') | Delivery lifecycle status. One-directional toward DELIVERED or FAILED. |
| `courier_id` | UUID | Yes | NULL | — | No FK — couriers are not a separate table in the current schema. The name and phone are stored inline. Planned for a future `couriers` table. |
| `courier_name` | TEXT | Yes | NULL | — | Name of the delivery person or platform name. Denormalized for quick display on the delivery dashboard. |
| `courier_phone` | TEXT | Yes | NULL | — | Phone number of the delivery person. Null for platform couriers. |
| `courier_type` | TEXT | Yes | NULL | CHECK IN ('INTERNAL', 'PLATFORM') | Whether the courier is internal staff or an external platform. Null until assigned. |
| `platform` | TEXT | Yes | NULL | CHECK IN ('IFOOD', 'RAPPI', 'UBER_EATS', 'LOGGI', 'OTHER') | Third-party platform identifier. Only non-null when courier_type = PLATFORM. |
| `platform_delivery_id` | TEXT | Yes | NULL | — | The external reference ID from the delivery platform. Used for status sync via webhooks. |
| `delivery_address` | JSONB | No | — | NOT NULL | Immutable address snapshot copied from the Order at Delivery creation time. Format: { street, number, complement, neighborhood, city, state, postalCode, country, latitude, longitude }. |
| `estimated_minutes` | INTEGER | Yes | NULL | CHECK > 0 | Estimated delivery time in minutes from dispatch. Provided by the courier or platform. |
| `failed_reason` | TEXT | Yes | NULL | — | Required when status = FAILED. Describes why the delivery could not be completed. |
| `dispatched_at` | TIMESTAMPTZ | Yes | NULL | — | UTC timestamp when the courier left the store. |
| `delivered_at` | TIMESTAMPTZ | Yes | NULL | — | UTC timestamp when the order reached the customer. |
| `failed_at` | TIMESTAMPTZ | Yes | NULL | — | UTC timestamp when the delivery was marked as failed. |
| `created_at` | TIMESTAMPTZ | No | `now()` | NOT NULL | UTC timestamp of record creation. |
| `updated_at` | TIMESTAMPTZ | No | `now()` | NOT NULL | UTC timestamp of last modification. |

---

# Invoices

**Purpose**
A fiscal document (NF-e or NFC-e) generated for a completed, paid Order. Required for Brazilian tax compliance. Invoices are immutable after issuance — corrections require cancelling the original and issuing a new one. Invoice generation is triggered by Payment reaching PAID status and is not part of the operational flow.

**Table name:** `invoices`

**Primary Key:** `id UUID`

**Unique Constraints**
- `order_id` — one Invoice per Order.
- `(store_id, invoice_number, series)` — the combination of store, fiscal number, and series is unique (matching fiscal requirements).
- `access_key` WHERE `access_key IS NOT NULL` — the 44-digit chave de acesso is globally unique by law.

**Foreign Keys**
- `order_id → orders.id` (RESTRICT on delete)
- `payment_id → payments.id` (RESTRICT on delete)
- `store_id → stores.id` (RESTRICT on delete)

**Indexes**
- Primary key on `id` (automatic).
- Unique index on `order_id`.
- Unique index on `(store_id, invoice_number, series)`.
- Unique index on `access_key` WHERE `access_key IS NOT NULL`.
- Index on `(store_id, status)` — filter pending/issued/cancelled invoices.

| Column | Type | Nullable | Default | Constraints | Explanation |
|---|---|---|---|---|---|
| `id` | UUID | No | `gen_random_uuid()` | PK | Unique identifier. |
| `order_id` | UUID | No | — | NOT NULL, UNIQUE, FK → orders.id RESTRICT | The order this invoice documents. |
| `payment_id` | UUID | No | — | NOT NULL, FK → payments.id RESTRICT | The payment this invoice settles. |
| `store_id` | UUID | No | — | NOT NULL, FK → stores.id RESTRICT | Store scope for multi-tenancy and fiscal reporting. |
| `customer_tax_id` | TEXT | Yes | NULL | — | CPF or CNPJ of the customer at invoice time. May be null for anonymous orders. |
| `invoice_number` | BIGINT | Yes | NULL | — | Sequential fiscal document number assigned by the tax authority. Null until issued. |
| `series` | TEXT | Yes | NULL | — | Fiscal document series (e.g., "001"). Null until issued. |
| `type` | TEXT | No | `'NFCE'` | NOT NULL, CHECK IN ('NFCE', 'NFE') | NFCE = Nota Fiscal do Consumidor Eletrônica (consumer). NFE = Nota Fiscal Eletrônica (business-to-business). |
| `status` | TEXT | No | `'PENDING'` | NOT NULL, CHECK IN ('PENDING', 'ISSUED', 'CANCELLED') | PENDING = awaiting fiscal authority processing. ISSUED = valid fiscal document. CANCELLED = cancelled with reason. |
| `xml_url` | TEXT | Yes | NULL | — | URL of the fiscal XML document (required for legal storage for 5 years). |
| `pdf_url` | TEXT | Yes | NULL | — | URL of the printable DANFE PDF. |
| `access_key` | TEXT | Yes | NULL | UNIQUE WHERE NOT NULL, LENGTH = 44 | Chave de acesso — the 44-digit unique identifier assigned by SEFAZ. Globally unique by law. |
| `issued_at` | TIMESTAMPTZ | Yes | NULL | — | UTC timestamp when SEFAZ authorized the document. |
| `cancelled_at` | TIMESTAMPTZ | Yes | NULL | — | UTC timestamp of cancellation. |
| `cancellation_reason` | TEXT | Yes | NULL | — | Required when status = CANCELLED. |
| `created_at` | TIMESTAMPTZ | No | `now()` | NOT NULL | UTC timestamp of record creation. |
| `updated_at` | TIMESTAMPTZ | No | `now()` | NOT NULL | UTC timestamp of last modification. |

---

# Ingredients

**Purpose**
A raw material (insumo) tracked by the Inventory module. Ingredients are bought and consumed, never sold — Products sell; the Recipe links the two. The `current_stock` column is a denormalized balance that must always equal the sum of the ingredient's `stock_movements.quantity_delta`, maintained in the same transaction as every movement insert (Business Rule 38).

**Table name:** `ingredients`

**Primary Key:** `id UUID`

**Unique Constraints**
- `(store_id, name)` WHERE `deleted_at IS NULL` — ingredient names are unique per store among non-deleted rows.

**Foreign Keys**
- `store_id → stores.id` (RESTRICT on delete)

**Indexes**
- Primary key on `id` (automatic).
- Unique index on `(store_id, name)` WHERE `deleted_at IS NULL`.
- Index on `(store_id, status)` — filter active/inactive.
- Index on `(store_id)` WHERE `min_stock IS NOT NULL` — low-stock alert scan.

**Soft Delete:** `deleted_at` — ingredients are soft-deleted to preserve the movement ledger and historical recipe references. Deletion is blocked while any recipe references the ingredient (Business Rule 44).

| Column | Type | Nullable | Default | Constraints | Explanation |
|---|---|---|---|---|---|
| `id` | UUID | No | `gen_random_uuid()` | PK | Unique identifier. |
| `store_id` | UUID | No | — | NOT NULL, FK → stores.id RESTRICT | The store that owns this ingredient. |
| `name` | TEXT | No | — | NOT NULL | Display name, e.g. "Farinha de trigo tipo 1". Unique per store. |
| `unit` | TEXT | No | — | NOT NULL, CHECK IN ('G', 'ML', 'UN') | Base unit of measure. Immutable after creation — changing it would silently rescale every recipe and movement. G = grams, ML = milliliters, UN = discrete units. No unit conversion exists anywhere; UIs may display kg/L by dividing by 1000. |
| `current_stock` | NUMERIC(14,3) | No | `0` | NOT NULL | Denormalized balance in base units. May be negative (Business Rule 41) — negative stock signals a count error and surfaces as an alert, never blocks a sale. |
| `min_stock` | NUMERIC(14,3) | Yes | NULL | CHECK (min_stock >= 0) | Low-stock alert threshold. NULL disables the alert for this ingredient. |
| `cost_per_unit` | NUMERIC(14,6) | No | `0` | NOT NULL, CHECK (cost_per_unit >= 0) | Cost in cents per base unit (e.g., R$ 5,00/kg flour = 0.5 cents/g). Deliberate exception to the integer-cents Monetary Columns convention: per-gram costs are fractional cents. This is a cost input used for recipe costing and movement snapshots — never a charged amount, so rounding rules for customer-facing values do not apply. |
| `status` | TEXT | No | `'ACTIVE'` | NOT NULL, CHECK IN ('ACTIVE', 'INACTIVE') | INACTIVE hides the ingredient from new recipe references without breaking existing ones. |
| `deleted_at` | TIMESTAMPTZ | Yes | NULL | — | Soft delete timestamp. |
| `created_at` | TIMESTAMPTZ | No | `now()` | NOT NULL | UTC timestamp of record creation. |
| `updated_at` | TIMESTAMPTZ | No | `now()` | NOT NULL | UTC timestamp of last modification. |

---

# Recipes

**Purpose**
The ficha técnica header of a Product: yield and notes. The ingredient lines live in `recipe_items`. One Recipe per Product, enforced by a unique constraint. Recipe costs are always computed at read time from current `ingredients.cost_per_unit` — never stored (movement snapshots, not recipes, are the historical cost record).

**Table name:** `recipes`

**Primary Key:** `id UUID`

**Unique Constraints**
- `product_id` — one Recipe per Product.

**Foreign Keys**
- `store_id → stores.id` (RESTRICT on delete)
- `product_id → products.id` (CASCADE on delete — a hard-deleted product takes its recipe with it; note products are soft-deleted in practice)

**Indexes**
- Primary key on `id` (automatic).
- Unique index on `product_id`.
- Index on `store_id` — list all recipes of a store.

| Column | Type | Nullable | Default | Constraints | Explanation |
|---|---|---|---|---|---|
| `id` | UUID | No | `gen_random_uuid()` | PK | Unique identifier. |
| `store_id` | UUID | No | — | NOT NULL, FK → stores.id RESTRICT | Store scope (always equals the product's store; duplicated for the mandatory store-isolation WHERE clause). |
| `product_id` | UUID | No | — | NOT NULL, UNIQUE, FK → products.id CASCADE | The product this ficha técnica describes. |
| `yield_quantity` | NUMERIC(10,3) | No | `1` | NOT NULL, CHECK (yield_quantity > 0) | How many units of the Product one execution of the recipe produces (rendimento). Consumption per product unit divides by this. |
| `notes` | TEXT | Yes | NULL | — | Free-form preparation notes (observações). |
| `created_at` | TIMESTAMPTZ | No | `now()` | NOT NULL | UTC timestamp of record creation. |
| `updated_at` | TIMESTAMPTZ | No | `now()` | NOT NULL | UTC timestamp of last modification. |

---

# Recipe Items

**Purpose**
One ingredient line of a Recipe: nominal quantity per recipe execution plus the waste percentage (perda) applied on top. Effective consumption per product unit = `quantity × (1 + waste_pct/100) ÷ recipe.yield_quantity`.

**Table name:** `recipe_items`

**Primary Key:** `id UUID`

**Unique Constraints**
- `(recipe_id, ingredient_id)` — an ingredient appears at most once per recipe.

**Foreign Keys**
- `recipe_id → recipes.id` (CASCADE on delete — items are owned by their recipe)
- `ingredient_id → ingredients.id` (RESTRICT on delete — enforces Business Rule 44 at the database level)

**Indexes**
- Primary key on `id` (automatic).
- Unique index on `(recipe_id, ingredient_id)`.
- Index on `ingredient_id` — "which recipes use this ingredient" lookup (deletion guard and impact analysis).

| Column | Type | Nullable | Default | Constraints | Explanation |
|---|---|---|---|---|---|
| `id` | UUID | No | `gen_random_uuid()` | PK | Unique identifier. |
| `recipe_id` | UUID | No | — | NOT NULL, FK → recipes.id CASCADE | Parent recipe. |
| `ingredient_id` | UUID | No | — | NOT NULL, FK → ingredients.id RESTRICT | The ingredient consumed. |
| `quantity` | NUMERIC(14,3) | No | — | NOT NULL, CHECK (quantity > 0) | Nominal amount consumed per recipe execution, in the ingredient's base unit. |
| `waste_pct` | NUMERIC(5,2) | No | `0` | NOT NULL, CHECK (waste_pct >= 0 AND waste_pct <= 100) | Percentage loss (perda) applied on top of `quantity` — trimming, evaporation, spillage. |
| `created_at` | TIMESTAMPTZ | No | `now()` | NOT NULL | UTC timestamp of record creation. |
| `updated_at` | TIMESTAMPTZ | No | `now()` | NOT NULL | UTC timestamp of last modification. |

---

# Stock Movements

**Purpose**
The immutable, append-only ledger of every stock change. Rows are never updated or deleted (no `updated_at` column); corrections append `ADJUSTMENT` movements. `SALE_CONSUMPTION` and `SALE_REVERSAL` rows are written by the Inventory event consumer inside the order-confirmation/cancellation transaction; the `(order_id, ingredient_id, type)` uniqueness makes that consumer idempotent (Business Rule 39).

**Table name:** `stock_movements`

**Primary Key:** `id UUID`

**Unique Constraints**
- `(order_id, ingredient_id, type)` — at most one automatic movement of each type per order/ingredient pair. Rows with NULL `order_id` (manual movements) are unaffected, since NULLs are distinct in PostgreSQL unique indexes.

**Foreign Keys**
- `store_id → stores.id` (RESTRICT on delete)
- `ingredient_id → ingredients.id` (RESTRICT on delete — the ledger outlives nothing; ingredients are soft-deleted)
- `order_id → orders.id` (RESTRICT on delete)
- `created_by_user_id → users.id` (RESTRICT on delete)

**Indexes**
- Primary key on `id` (automatic).
- Unique index on `(order_id, ingredient_id, type)`.
- Index on `(store_id, ingredient_id, created_at DESC)` — an ingredient's movement history, newest first.
- Index on `(store_id, created_at DESC)` — store-wide movement list, newest first.
- Index on `(store_id, type, created_at)` — CMV period aggregation over SALE_CONSUMPTION/SALE_REVERSAL.

| Column | Type | Nullable | Default | Constraints | Explanation |
|---|---|---|---|---|---|
| `id` | UUID | No | `gen_random_uuid()` | PK | Unique identifier. |
| `store_id` | UUID | No | — | NOT NULL, FK → stores.id RESTRICT | Store scope. |
| `ingredient_id` | UUID | No | — | NOT NULL, FK → ingredients.id RESTRICT | The ingredient whose balance this movement changes. |
| `type` | TEXT | No | — | NOT NULL, CHECK IN ('ENTRY', 'EXIT', 'ADJUSTMENT', 'LOSS', 'SALE_CONSUMPTION', 'SALE_REVERSAL') | ENTRY = goods received. EXIT = manual withdrawal. ADJUSTMENT = count correction (either sign). LOSS = breakage/spoilage. SALE_CONSUMPTION/SALE_REVERSAL = automatic, order-linked. |
| `quantity_delta` | NUMERIC(14,3) | No | — | NOT NULL, CHECK (quantity_delta <> 0); sign-per-type CHECK: > 0 for ENTRY and SALE_REVERSAL, < 0 for EXIT, LOSS and SALE_CONSUMPTION | Signed quantity in the ingredient's base unit. The balance is the sum of these. |
| `unit_cost` | NUMERIC(14,6) | No | — | NOT NULL, CHECK (unit_cost >= 0) | Snapshot of `ingredients.cost_per_unit` (cents per base unit) at movement time. CMV reads these snapshots, never current costs (Business Rule 45). |
| `order_id` | UUID | Yes | NULL | FK → orders.id RESTRICT; CHECK: NOT NULL when type IN ('SALE_CONSUMPTION','SALE_REVERSAL'), NULL otherwise | The order that caused an automatic movement. Always NULL for manual types. |
| `reason` | TEXT | Yes | NULL | CHECK: NOT NULL when type IN ('ADJUSTMENT', 'LOSS') | Mandatory justification for corrections and losses. |
| `created_by_user_id` | UUID | Yes | NULL | FK → users.id RESTRICT | The operator for manual movements. NULL for automatic (event-driven) movements. |
| `created_at` | TIMESTAMPTZ | No | `now()` | NOT NULL | UTC timestamp. The only timestamp — movements are immutable, so there is no `updated_at`. |

---

# Relationships

## One-to-One Relationships

| Parent | Child | FK Column | Why |
|---|---|---|---|
| `stores` | `store_settings` | `store_settings.store_id` | Every store has exactly one configuration record. Kept separate to allow the core Store identity to evolve independently from operational preferences. |
| `orders` | `kitchen_tickets` | `kitchen_tickets.order_id` | A confirmed Order produces exactly one Kitchen Ticket. The 1:1 constraint enforces the business rule that kitchen production cannot begin without a confirmed order. |
| `orders` | `payments` | `payments.order_id` | An Order has at most one active Payment. Multiple payment attempts are tracked in `payment_attempts` but only one can be in the PAID state. |
| `orders` | `deliveries` | `deliveries.order_id` | A delivery-type Order has at most one Delivery record. Created automatically when the Kitchen Ticket reaches READY. |
| `orders` | `invoices` | `invoices.order_id` | An Order produces at most one Invoice. Corrections require cancellation and re-issuance. |
| `products` | `recipes` | `recipes.product_id` | A Product has at most one Recipe (ficha técnica). The 1:1 constraint keeps costing and automatic consumption unambiguous. |

## One-to-Many Relationships

| Parent | Children | FK Column | Why |
|---|---|---|---|
| `organizations` | `accounts` | `accounts.organization_id` | An Organization (franchise HQ) can own multiple Accounts (franchise units). |
| `accounts` | `stores` | `stores.account_id` | A business Account can manage multiple Store locations. |
| `stores` | `users` via `memberships` | `memberships.store_id` | A Store has many Users, each with a defined Role. The relationship is expressed through the join table. |
| `stores` | `customers` | `customers.store_id` | A Store accumulates its own customer base. Customers are not shared between stores. |
| `stores` | `categories` | `categories.store_id` | Each Store manages its own product catalog organization independently. |
| `stores` | `products` | `products.store_id` | Each Store owns its own products and pricing. |
| `stores` | `menus` | `menus.store_id` | A Store may have multiple published menus for different channels or time windows. |
| `stores` | `orders` | `orders.store_id` | All orders belong to a specific store. |
| `customers` | `addresses` | `addresses.customer_id` | A customer may have multiple saved delivery addresses. |
| `customers` | `orders` | `orders.customer_id` | A customer's full order history is accessible via this relationship. |
| `categories` | `products` | `products.category_id` | Products are organized into exactly one category each. |
| `products` | `modifier_groups` | `modifier_groups.product_id` | A product may have multiple customization dimensions. |
| `modifier_groups` | `modifiers` | `modifiers.modifier_group_id` | Each customization dimension has multiple selectable options. |
| `orders` | `order_items` | `order_items.order_id` | An Order contains one or more line items. |
| `orders` | `order_status_transitions` | `order_status_transitions.order_id` | The complete lifecycle history of an Order is an append-only log of its status transitions. |
| `kitchen_tickets` | `kitchen_items` | `kitchen_items.ticket_id` | A Kitchen Ticket contains one item per product line in the Order. |
| `orders` | `payment_attempts` | `payment_attempts.order_id` | Multiple failed payment attempts may occur before a successful one. |
| `users` | `refresh_tokens` | `refresh_tokens.user_id` | A user may hold multiple active sessions (e.g., multiple devices). |
| `users` | `password_reset_tokens` | `password_reset_tokens.user_id` | Historical reset requests are retained (revoked, not deleted) for audit; only one is active at a time. |
| `memberships` | `invitation_tokens` | `invitation_tokens.membership_id` | Historical invitations are retained (revoked, not deleted) for audit; only one is active at a time. |
| `stores` | `ingredients` | `ingredients.store_id` | Each Store tracks its own raw materials and stock levels. |
| `recipes` | `recipe_items` | `recipe_items.recipe_id` | A ficha técnica lists one line per ingredient consumed. |
| `ingredients` | `recipe_items` | `recipe_items.ingredient_id` | An ingredient may appear in many recipes. |
| `ingredients` | `stock_movements` | `stock_movements.ingredient_id` | The append-only ledger whose sum is the ingredient's balance. |
| `orders` | `stock_movements` | `stock_movements.order_id` | Automatic consumption/reversal movements are linked to the order that caused them. |

## Many-to-Many Relationships

| Entity A | Entity B | Join Table | Extra Columns | Why |
|---|---|---|---|---|
| `users` | `stores` | `memberships` | `role_id`, `status`, invitation timestamps | A User can belong to multiple Stores, and each Store can have many Users. The Membership carries the Role that governs permissions within each specific Store. |
| `menus` | `categories` | `menu_sections` | `sort_order`, `is_visible` | A Menu includes multiple Categories, and a Category can appear in multiple Menus. The Menu Section carries display-order configuration that is independent of the Category's own sort_order. |

---

# Database Rules

## Referential Integrity Rules

**RESTRICT on delete** is the default cascade behavior for all foreign keys that reference operational entities. This prevents accidental destruction of related records when a parent record is deleted. The specific cascade behaviors are:

- Deleting an `organization` is blocked if it has `accounts`.
- Deleting an `account` is blocked if it has `stores`.
- Deleting a `store` is blocked if it has `customers`, `products`, `categories`, `menus`, `orders`, `roles`, or `memberships`.
- Deleting a `customer` cascades to their `addresses` (the customer record and address book are destroyed together). Their Orders retain a null `customer_id` (SET NULL).
- Deleting a `user` sets `memberships.invited_by_user_id`, `orders.cancelled_by_user_id`, `payments.refunded_by_user_id`, and `order_status_transitions.triggered_by_user_id` to NULL via SET NULL. The user's identity as an audit actor is preserved in the text snapshots of those records.
- Deleting a `product` soft-deletes it — physical deletion is never performed. If it were, `order_items.product_id` would be SET NULL.
- Deleting a `modifier_group` cascades to its `modifiers`.
- Deleting a `menu` cascades to its `menu_sections`.
- Deleting a `kitchen_ticket` cascades to its `kitchen_items`.
- Financial records (`payments`, `payment_attempts`, `invoices`) are never deleted under any circumstances.
- Deleting a `user` cascades to their `refresh_tokens` and `password_reset_tokens` — session/reset artifacts have no meaning without their owner.
- Deleting a `membership` cascades to its `invitation_tokens`.

## Cascade Behaviors Summary

| Relationship | On Delete of Parent | Behavior |
|---|---|---|
| organization → accounts | RESTRICT | Cannot delete an organization with accounts |
| account → stores | RESTRICT | Cannot delete an account with stores |
| store → any operational table | RESTRICT | Cannot delete a store with data |
| customer → addresses | CASCADE | Addresses are destroyed with the customer |
| customer → orders | SET NULL | Orders retain null customer_id |
| product → order_items | SET NULL | Order items retain null product_id (snapshot is preserved) |
| modifier_group → modifiers | CASCADE | Modifiers are destroyed with the group |
| menu → menu_sections | CASCADE | Sections are destroyed with the menu |
| store_settings → (no children) | — | Terminal node |
| order → order_items | CASCADE | Safety constraint; orders are never deleted in practice |
| order → order_status_transitions | CASCADE | Safety constraint |
| kitchen_ticket → kitchen_items | CASCADE | Items are destroyed with the ticket |
| users (deleted) → FK references | SET NULL | Preserves audit trail with null actor |
| role → memberships | RESTRICT | Cannot delete a role in use |
| user → refresh_tokens | CASCADE | Sessions are destroyed with the user |
| user → password_reset_tokens | CASCADE | Reset requests are destroyed with the user |
| membership → invitation_tokens | CASCADE | Invitations are destroyed with the membership |

## Soft Delete Strategy

Soft delete is applied only to catalog entities that are referenced by historical records:

- `products` — `deleted_at TIMESTAMPTZ NULL`. Soft-deleted products are excluded from the ordering interface but their `id` remains valid as a soft reference in `order_items.product_id`.
- `categories` — `deleted_at TIMESTAMPTZ NULL`. A category with active products cannot be soft-deleted (enforced at application level).
- `modifier_groups` — `deleted_at TIMESTAMPTZ NULL`. Hidden from the ordering interface; historical Order Items are unaffected.
- `modifiers` — `deleted_at TIMESTAMPTZ NULL`. Historical snapshots in `order_items.selected_modifiers` are unaffected.
- `addresses` — `deleted_at TIMESTAMPTZ NULL`. Customers may remove addresses from their address book. Historical Order snapshots are unaffected.

All queries against soft-deleted tables must include `WHERE deleted_at IS NULL` to exclude deleted records. This filter should be applied at the service/repository layer, never left to the caller.

Entities that use a **status field** instead of soft delete (because their lifecycle is richer than active/deleted):
`orders` (status = CANCELLED), `customers` (status = BLOCKED), `users` (status = INACTIVE), `memberships` (status = REVOKED), `stores` (status = INACTIVE/SUSPENDED), `accounts` (status = SUSPENDED).

Financial records (`payments`, `payment_attempts`, `invoices`) are **never deleted and never soft-deleted**. They are permanent audit records.

**Deliberate exception — `revoked_at` instead of `deleted_at`:** `refresh_tokens`, `password_reset_tokens`, and `invitation_tokens` use `revoked_at`, not `deleted_at`. This is not the same mechanism as catalog soft-delete: a revoked token is never presented to a client again as valid, but the row is deliberately retained (never deleted) so a replayed/reused token can still be recognized and its whole session invalidated, per API_SPEC.md's Refresh Token Strategy. Queries for an *active* token filter on `WHERE revoked_at IS NULL AND expires_at > now()`.

**Deliberate exception — hard delete:** `menus` and `menu_sections` are **hard-deleted**, not soft-deleted. Unlike the catalog entities above, they are pure publishing/configuration artifacts with no historical significance — no other table snapshots or references a Menu the way `order_items` snapshots a Product. See `DELETE /stores/:storeId/menus/:menuId` in `API_SPEC.md`.

## Timestamp Strategy

Every table that has an independent lifecycle carries two mandatory timestamps:

- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()` — set once at record creation. Never modified.
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()` — updated on every modification via a database trigger or application-layer hook.

Both columns are stored in UTC (TIMESTAMPTZ). Conversion to the Store's local timezone (stored in `stores.timezone`) happens at the application layer, never in the database.

**Operational timestamps** are additional columns that record specific business events. They are set once and never overwritten:

| Table | Operational Timestamps |
|---|---|
| `orders` | `confirmed_at`, `ready_at`, `delivered_at`, `cancelled_at` |
| `kitchen_tickets` | `queued_at`, `started_at`, `ready_at`, `cancelled_at` |
| `deliveries` | `dispatched_at`, `delivered_at`, `failed_at` |
| `payments` | `paid_at`, `refunded_at` |
| `invoices` | `issued_at`, `cancelled_at` |
| `memberships` | `invited_at`, `accepted_at`, `revoked_at` |
| `users` | `last_login_at` |
| `refresh_tokens` | `revoked_at` |
| `password_reset_tokens` | `revoked_at` |
| `invitation_tokens` | `revoked_at` |

**Tables without `updated_at`** (append-only or immutable):
- `order_status_transitions` — rows are never updated.
- `kitchen_items` — managed through parent ticket lifecycle.
- `menu_sections` — pure configuration join table.
- `refresh_tokens`, `password_reset_tokens`, `invitation_tokens` — created once and mutated at most once (`revoked_at` set), which is itself the timestamp of that change; a separate `updated_at` would be redundant.

## Audit Strategy

Every write to an operational entity must be attributable to a User or to a system process. The current audit approach is:

1. **Inline attribution:** Key tables carry a `*_by_user_id` column for important actions — `orders.cancelled_by_user_id`, `payments.refunded_by_user_id`, `memberships.invited_by_user_id`.

2. **Transition log:** `order_status_transitions` is an append-only table with `triggered_by_user_id` on every row. This is the model for future audit tables on other entities.

3. **Future audit_log table:** A generic `audit_log` table (entity_type, entity_id, action, changed_by_user_id, before_snapshot JSONB, after_snapshot JSONB, occurred_at) should be introduced when compliance requirements demand full field-level change tracking. This table does not exist yet and must not be added until required.

The current design is sufficient for operational needs. The `order_status_transitions` pattern can be replicated for other entities (payment status history, product price history) when the need arises.

## Multi-Tenancy Strategy

MarginFlow uses a **row-level multi-tenancy** model. Every table that holds operational data includes a `store_id` column. The Store is the isolation boundary.

**Rules:**
1. Every query against an operational table must include `WHERE store_id = :storeId` as a mandatory filter.
2. The application layer must validate that the requesting user's `membership.store_id` matches the `store_id` in every query parameter.
3. Cross-store data access is not permitted for any user without an explicit cross-store membership (a future feature for multi-store managers).
4. The `store_id` column is never nullable on operational tables. It is the primary multi-tenancy guard.

**Why row-level instead of schema-per-tenant:** A schema-per-tenant (separate PostgreSQL schema per store) would make cross-store reporting, migrations, and maintenance significantly more complex. Row-level tenancy with mandatory `store_id` filtering achieves equivalent isolation with a simpler operational model. At the scale of hundreds of stores, this approach performs well with proper indexing.

---

# Naming Convention

## Table Names
All table names are **plural** and **snake_case**.

Examples: `orders`, `order_items`, `kitchen_tickets`, `modifier_groups`, `store_settings`, `order_status_transitions`.

## Column Names
All column names are **singular** and **snake_case**.

Examples: `store_id`, `customer_id`, `grand_total`, `is_available`, `created_at`.

## Primary Keys
All primary keys are named `id` and use the **UUID** type with `gen_random_uuid()` as the default value.

UUIDs are used instead of auto-incrementing integers because:
- They are safe to generate in the application layer before the database INSERT.
- They do not reveal the volume of records to external observers.
- They are globally unique across tables, making cross-entity references unambiguous.
- They enable future event sourcing or distributed ID generation without schema changes.

The exception is `orders.number` — a sequential integer per store for the human-readable order reference. This is not the primary key; it is a business identifier.

## Foreign Keys
Foreign key columns are named `{referenced_table_singular}_id`.

Examples: `store_id` references `stores.id`, `order_id` references `orders.id`, `modifier_group_id` references `modifier_groups.id`.

## Boolean Columns
Boolean columns are prefixed with `is_` or `has_` to make their meaning unambiguous.

Examples: `is_active`, `is_available`, `is_required`, `is_default`, `is_system_role`.

## Timestamp Columns

| Column | Meaning |
|---|---|
| `created_at` | UTC timestamp of row insertion. Set once, never changed. |
| `updated_at` | UTC timestamp of the most recent modification. Updated on every write. |
| `deleted_at` | UTC timestamp of soft deletion. NULL = record is active. |
| `*_at` suffix | Any other `*_at` column records a specific business event at a specific time. |

## Status Columns
All status columns are named `status` and store TEXT values in SCREAMING_SNAKE_CASE.

Examples: `'ACTIVE'`, `'OUT_FOR_DELIVERY'`, `'PARTIALLY_REFUNDED'`.

CHECK constraints enforce valid values at the database level. Application-level enums provide type safety in code.

## Monetary Columns
All monetary columns store values as **INTEGER (cents)**.

Column names use descriptive nouns: `price`, `amount`, `grand_total`, `items_total`, `delivery_fee`, `discount_total`, `price_adjustment`, `refunded_amount`.

Never: `price_float`, `amount_decimal`, `total_dollars`.

## JSONB Columns
JSONB columns are used only for:
- **Snapshots** — data copied at a point in time that must not change (delivery address, selected modifiers).
- **Structured configuration** — hierarchical configuration data where querying individual fields is not required at the database level (operating_hours, availability_schedule, notification_preferences).
- **External payloads** — data received from third parties whose structure is not controlled (gateway_response).

Never use JSONB as a substitute for proper relational modeling. If a field inside a JSONB column needs to be queried, filtered, or indexed, it should be extracted to a real column.

---

# Performance

## Orders

The `orders` table is the highest-traffic table in the system. Every operational view — active orders list, KDS, delivery dashboard — reads from it.

| Index | Columns | Type | Purpose |
|---|---|---|---|
| Primary | `id` | B-tree UNIQUE | Single order lookup by ID |
| Order number | `(store_id, number)` | B-tree UNIQUE | Human-readable order lookup (#4821) |
| Active orders | `(store_id, status)` | B-tree | Active orders management view |
| Order history | `(store_id, created_at DESC)` | B-tree | Paginated order history list |
| Type + status | `(store_id, type, status)` | B-tree | Filter delivery/takeaway/dine-in orders |
| Customer orders | `(store_id, customer_id)` | B-tree | All orders for a customer at this store |
| Channel filter | `(store_id, channel)` | B-tree | Filter by sales channel |
| Scheduled queue | `(store_id, scheduled_for)` PARTIAL WHERE `scheduled_for IS NOT NULL` | B-tree | Scheduled order activation queue |

## Customers

| Index | Columns | Type | Purpose |
|---|---|---|---|
| Primary | `id` | B-tree UNIQUE | Lookup by ID |
| Phone lookup | `(store_id, phone)` | B-tree UNIQUE | Primary customer search (most common operation) |
| Recent activity | `(store_id, last_order_at DESC)` | B-tree | CRM — recently active customers |
| Top spenders | `(store_id, total_spent DESC)` | B-tree | CRM — highest-value customers |
| Status filter | `(store_id, status)` | B-tree | Blocked customer check at order creation |

## Products

| Index | Columns | Type | Purpose |
|---|---|---|---|
| Primary | `id` | B-tree UNIQUE | Lookup by ID |
| Category view | `(store_id, category_id, sort_order)` | B-tree | Ordered products within a category |
| Available products | `(store_id, status, is_available)` PARTIAL WHERE `deleted_at IS NULL` | B-tree | Ordering interface — active, available products only |
| SKU lookup | `(store_id, sku)` PARTIAL WHERE `sku IS NOT NULL` | B-tree UNIQUE | Inventory integration lookups |
| Modifier groups | `product_id, sort_order` on `modifier_groups` | B-tree | Load customization options for a product |
| Modifiers | `modifier_group_id, sort_order` on `modifiers` | B-tree | Load options within a group |

## Payments

| Index | Columns | Type | Purpose |
|---|---|---|---|
| Primary | `id` | B-tree UNIQUE | Lookup by ID |
| Order payment | `order_id` | B-tree UNIQUE | Payment for a specific order |
| Daily summary | `(store_id, paid_at DESC)` PARTIAL WHERE `paid_at IS NOT NULL` | B-tree | Daily revenue calculations |
| Status | `(store_id, status)` | B-tree | Pending/failed payment monitoring |
| Method | `(store_id, method)` | B-tree | Cash count, card settlement reports |

## Kitchen

| Index | Columns | Type | Purpose |
|---|---|---|---|
| Primary | `id` | B-tree UNIQUE | Lookup by ID |
| Order lookup | `order_id` | B-tree UNIQUE | Ticket for a specific order |
| Active queue | `(store_id, status)` | B-tree | KDS — QUEUED and PREPARING tickets |
| Queue time | `(store_id, queued_at ASC)` | B-tree | Time-ordered queue for oldest-first display |
| Ticket items | `ticket_id` on `kitchen_items` | B-tree | Items for a specific ticket |
| Status history | `(order_id, occurred_at DESC)` on `order_status_transitions` | B-tree | Order lifecycle history |

## Delivery

| Index | Columns | Type | Purpose |
|---|---|---|---|
| Primary | `id` | B-tree UNIQUE | Lookup by ID |
| Order lookup | `order_id` | B-tree UNIQUE | Delivery for a specific order |
| Active deliveries | `(store_id, status)` | B-tree | In-flight deliveries dashboard |
| History | `(store_id, created_at DESC)` | B-tree | Delivery history list |

## Inventory

| Index | Columns | Type | Purpose |
|---|---|---|---|
| Ingredient name | `(store_id, name)` WHERE `deleted_at IS NULL` | B-tree UNIQUE | Uniqueness + name lookup |
| Low-stock scan | `(store_id)` WHERE `min_stock IS NOT NULL` | B-tree | Alert list without scanning alert-disabled rows |
| Movement history | `(store_id, ingredient_id, created_at DESC)` | B-tree | Per-ingredient ledger, newest first |
| Movement list | `(store_id, created_at DESC)` | B-tree | Store-wide movement screen |
| CMV aggregation | `(store_id, type, created_at)` | B-tree | Period sum over SALE_CONSUMPTION/SALE_REVERSAL |
| Consumption idempotency | `(order_id, ingredient_id, type)` | B-tree UNIQUE | At-most-once automatic movement per order/ingredient/type |
| Recipe by product | `product_id` | B-tree UNIQUE | Ficha técnica lookup at order confirmation |
| Ingredient usage | `recipe_items.ingredient_id` | B-tree | "Which recipes use this ingredient" (deletion guard) |

---

# Future Scalability

## How This Schema Evolves Without Breaking Existing Data

**Adding new columns** is always backward-compatible. New nullable columns or columns with default values can be added with a non-blocking `ALTER TABLE ADD COLUMN`. Existing rows receive the default value or NULL. No application downtime is required.

**Adding new status values** requires dropping and recreating a CHECK constraint. Because statuses are stored as TEXT (not PostgreSQL ENUM), this is a relatively fast operation. The alternative — PostgreSQL ENUM — requires `ALTER TYPE` which can lock the table. TEXT + CHECK is the deliberate choice for extensibility.

**Adding new features through new tables** is the primary extension mechanism. Each future domain (Inventory, Loyalty, Coupons, Reservations, Table Management) adds its own tables and connects to existing tables through foreign keys or event subscriptions. Existing tables are not modified.

**Removing columns** is a two-phase operation: (1) stop writing to the column in application code, (2) deploy the `ALTER TABLE DROP COLUMN` migration in a separate release. This avoids downtime when the column is in active use.

## Inventory v2 — Purchasing & Traceability

The Inventory core is implemented (see `ingredients`, `recipes`, `recipe_items`, `stock_movements` above) — it connected to the existing schema exactly as this section originally predicted: new tables plus event subscriptions, with zero changes to `products` or `orders`. The v2 extension (Suppliers, Purchase Orders, Lots/expiry, inter-store transfers, structured count sessions) follows the same pattern: `suppliers`, `purchase_orders`, `purchase_order_items`, `stock_lots` and `count_sessions` tables will reference `ingredients.id`, and every physical effect lands in the existing `stock_movements` ledger (a received purchase = ENTRY movements; an expired lot = LOSS movements; a transfer = paired EXIT/ENTRY). No changes to the v1 tables are required.

## Loyalty Program

A `loyalty_transactions` table will reference `customers.id` and `orders.id`. When an Order reaches DELIVERED and Payment reaches PAID, an event triggers loyalty point accrual. The Orders and Payments tables are not modified.

## Coupons

A `coupons` table and a `coupon_usages` table will be added. The `orders.discount_total` column already exists — it captures the applied discount regardless of its source. A `coupon_id` column may be added to `orders` when coupons are implemented.

## Reservations

A `reservations` table will be added with a `store_id` and optional `order_id`. A `reservation_id` column can be added to `orders` when table booking links to a dine-in order.

## Table Management

A `tables` table and a `table_sessions` table will reference `stores.id` and `orders.id`. The `orders.table_number` column (currently a free-text field) will be replaced with a `table_id` foreign key when the Table Management module is built.

## Multi-Store Management

When a manager needs access to multiple stores, `memberships` already supports this — a User can have a Membership at each Store they manage. Cross-store reporting will be implemented as aggregation queries over the `store_id` column, not as a schema change.

## Franchise / Organization Tier

The `organizations` table and `accounts.organization_id` foreign key already exist in the schema. When franchise management is activated, the application layer begins using these tables and adds a `Franchise` role to the permissions system. No schema migration is needed for the core activation.

## Partitioning Strategy (High Volume)

When any single store accumulates tens of millions of orders, the `orders`, `order_items`, and `order_status_transitions` tables are candidates for PostgreSQL table partitioning by `store_id` (list partitioning) or by `created_at` range (range partitioning). The UUID primary keys and the presence of `store_id` and `created_at` on every row make this partitioning straightforward. No column renames or data migrations are required — only partition configuration.

## Read Replicas

Because every report, CRM query, and Finance calculation is strictly read-only (never modifying operational data), all reporting queries can be directed to a read replica with zero application-level changes. The strict separation between operational writes and analytical reads — enforced by the Domain Model — makes this the natural next step when the primary database approaches its read capacity.
