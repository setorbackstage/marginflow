# MarginFlow Architecture

## Vision

MarginFlow is a modern Restaurant Operating System (Restaurant OS).

The system is designed to manage the complete operation of restaurants, pizzerias, burger shops, cafés, bars, dark kitchens and multi-location businesses.

The application is modular and built for long-term evolution.

---

# Product Philosophy

MarginFlow is not an ERP.

MarginFlow is an Operating System.

Everything revolves around the restaurant operation.

Every feature exists to reduce operational friction.

---

# Core Principles

- Simplicity over complexity.
- Reuse before creating.
- Components first.
- Modular architecture.
- Strong typing.
- Clean code.
- Responsive UI.
- Fast navigation.
- Excellent UX.
- Scalable structure.

---

# Feature Architecture

Each feature is isolated.

Example:

features/

orders/

components/

hooks/

services/

types/

utils/

The same five-folder structure must be used across all **Feature Modules** — see the distinction below. Core Modules follow a leaner structure.

---

# Core Modules vs. Feature Modules

`features/` contains two kinds of modules. Both live under the same `features/` directory — this is not a physical split — but they play different roles and are held to different structural expectations.

**Core Modules** — `stores`, `users` (and the future `auth`) — own identity, tenancy, and permission primitives that every other module depends on. They map to the "Core" category in `PROJECT_BIBLE.md`'s module list (Autenticação, Usuários, Permissões, Lojas). Core Modules are consumed as pure data contracts by everything else; they do not render their own screens, so they typically only need a `types/` folder. (Store profile and Team management *screens* belong to the `settings` feature, which consumes Core types — they do not belong to `stores`/`users` themselves.)

**Feature Modules** — everything else: `orders`, `kitchen`, `delivery`, `payments`, `products`, `customers`, `crm`, `finance`, `reports`, `dashboard`, `settings`. These own a user-facing capability and get the full five-folder scaffold (`components/hooks/services/types/utils`) described above. `payments` is a Feature Module, not Core — it needs its own UI (payment method selection, refund dialog) even though it's foundational to the Order flow. Its `components/hooks/services/utils` folders are created when that feature's UI work begins, not preemptively. (Menu is API-spec'd as its own resource family and is a Feature Module candidate, but its types still live under `products/types/menu.ts` today — extracting it into its own `menu` module is a pending code change, not yet done.)

A new module defaults to Feature Module status. Only introduce a new Core Module for something every other feature needs as a data contract but that owns no screen of its own.

---

# Shared Layers

components/

Shared UI

hooks/

Shared React hooks

providers/

Application providers

services/

Shared services

types/

Global types

constants/

Static values

config/

Application configuration

utils/

Pure utility functions

---

# Current Modules

Core Modules:

Stores

Users

Feature Modules:

Dashboard

Orders

Kitchen

Products (Menu types currently live under `products/types/menu.ts` pending extraction into their own module — see Naming Improvements in the architecture audit)

Customers

CRM

Delivery

Payments

Finance

Reports

Settings

Integrations (Marketplace integrations: iFood — implemented. Rappi, Uber Eats — planned.)

Future modules must follow the same pattern — Feature Module by default, Core Module only for a new identity/tenancy primitive with no screen of its own.

---

# Server Layer

The `server/` directory is the backend-only code boundary. It never imports from `features/`, `components/`, `hooks/`, or any file without `"server-only"` at the top.

**`server/repositories/`** — one file per Prisma model. Each repository owns all Prisma queries for that model. Services never call `prisma.*` directly — they go through repositories.

**`server/services/`** — domain services. Each service owns business logic for one domain. Services call repositories and publish domain events. They never call each other unless the domain boundary explicitly allows it.

**`server/integrations/`** — third-party API clients. Each subdirectory is one external platform. The pattern: `client.ts` (HTTP wrapper + retry), `auth.ts` (OAuth token management), `mapper.ts` (maps platform schema → `MappedMarketplaceOrder`), `orders.ts` (outbound order actions), `events.ts` (event polling), `merchant.ts` (store operations), `catalog.ts` (product sync). Platform-specific code never leaks beyond this boundary.

**`server/lib/`** — shared backend utilities: HTTP composition helpers (`compose`, `withErrorHandling`, `ok`), request parsing (`requireAuth`, `parseQuery`, `requireUuidParams`), logger, domain event bus.

**`server/db.ts`** — Prisma client singleton with `@prisma/adapter-pg` for connection pooling.

---

# UI Rules

Always use shadcn/ui.

Always use Tailwind.

Dark mode first.

Desktop first.

Responsive.

Reusable components.

No duplicated layouts.

---

# Business Philosophy

The Order is the center of the system.

Everything starts from an Order.

Customer

↓

Order

↓

Kitchen

↓

Delivery

↓

Payment

↓

Reports

↓

CRM

Every future feature must support this flow.

---

# Development Rules

Never duplicate components.

Never duplicate business logic.

Never mix features.

Always create reusable code.

Always preserve architecture.

Always document important decisions.

---

# Long-term Goal

MarginFlow should become a complete Restaurant Operating System capable of replacing traditional restaurant management software while maintaining a modern, intuitive and scalable architecture.