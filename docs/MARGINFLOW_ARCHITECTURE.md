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

The same structure must be used across all features.

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

# Current Features

Dashboard

Orders

Kitchen

Products

Customers

CRM

Delivery

Finance

Reports

Settings

Future features must follow the same pattern.

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