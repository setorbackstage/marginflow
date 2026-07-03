# Product Decisions

> This document records architectural and product decisions for MarginFlow.
>
> Every AI working on this project must read this file before implementing new features.
>
> If a decision changes, this document must be updated first.

---

# Product Vision

MarginFlow is a Restaurant Operating System.

It is not an ERP.

It is not just a POS.

Every feature must help restaurant operations become faster, simpler and more reliable.

---

# Product Principles

1. Simplicity over complexity.
2. Speed over unnecessary features.
3. Reuse over duplication.
4. Mobile-friendly, Desktop-first.
5. Progressive disclosure (show only what the user needs).
6. Every click must have a purpose.

---

# Core Business Object

The Order is the center of the system.

Everything revolves around an Order.

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

# Navigation

Use a permanent left sidebar.

Top navigation for contextual actions.

Breadcrumbs for navigation context.

Global search available from any screen.

---

# Application Language

The application UI must always be written in Brazilian Portuguese (pt-BR).

Variable names, code, documentation and architecture remain in English.

---

# Theme

Dark mode is the default.

Light mode is optional.

---

# Design

The interface should feel modern, clean and fast.

Visual inspiration:

- Linear
- Vercel
- Stripe Dashboard
- Notion

Do not copy these products.

Only follow their quality standards.

---

# Feature Philosophy

Every feature is independent.

Every feature owns:

- components
- hooks
- services
- types
- utils

Features communicate through well-defined contracts.

Never through internal implementation.

---

# Orders

Orders are the heart of the application.

Statuses should follow a predictable lifecycle.

Example:

Draft

↓

Pending

↓

Confirmed

↓

Preparing

↓

Ready

↓

Out for Delivery

↓

Delivered

Cancelled can happen before Delivered.

Every status transition must be recorded.

---

# Products

Products belong to Categories.

Products may have:

- Modifier Groups
- Modifiers
- Images
- Availability
- Multiple prices (future)

Products should never be hardcoded.

---

# Kitchen

Kitchen works with Tickets.

Kitchen does not manage payments.

Kitchen only manages production.

---

# Delivery

Delivery starts only after the kitchen marks the order as Ready.

Future integrations may connect with third-party delivery providers.

---

# CRM

CRM never changes operational data.

CRM consumes operational data.

Example:

Orders

↓

Customer history

↓

Segments

↓

Campaigns

---

# Reports

Reports are read-only.

Reports never modify operational data.

---

# Finance

Finance consumes completed orders.

Finance never changes order production.

---

# Future Features

Inventory

Reservations

Table Management

Loyalty Program

Coupons

Gift Cards

Marketplace Integrations

WhatsApp Ordering

AI Assistant

Multi-company

Franchise Management

---

# Performance

Avoid unnecessary renders.

Reuse components.

Lazy load when appropriate.

Optimize for speed.

---

# Accessibility

Keyboard navigation should be supported.

Proper semantic HTML.

Accessible forms.

Readable contrast.

---

# AI Rules

Before implementing any feature, always ask:

- Does this respect the architecture?
- Does this duplicate existing code?
- Can this be reused?
- Does this simplify the product?
- Does this improve the restaurant workflow?

If the answer is "no", stop and rethink the implementation.

---

# Decision Log

Every important product decision must be appended here.

Format:

## YYYY-MM-DD

Decision:

Reason:

Impact: