# MarginFlow — API Specification

> **Single source of truth for every backend endpoint.**
>
> Every engineer and every AI working on this project must read this document before implementing any API route, service method, or frontend data-fetching call. If a business rule changes, update `DOMAIN_MODEL.md` first, then update this document to reflect the API consequence. If a database schema changes, update `DATA_MODEL.md` first, then update this document.
>
> This document does not contain Prisma models, SQL, or OpenAPI/Swagger definitions. It is a human-readable contract.

---

## Global Conventions

### Base URL

```
https://{tenant}.marginflow.app/api/v1
```

During local development:

```
http://localhost:3000/api/v1
```

### Request Format

All request bodies must be sent as `application/json`. File uploads use `multipart/form-data` where specified.

### Response Envelope

All responses use a consistent envelope:

**Single resource:**
```json
{
  "data": { }
}
```

**Collection (list):**
```json
{
  "data": [ ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 143,
    "totalPages": 8,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

**Operation result (no resource body):**
```json
{
  "data": null
}
```

### Monetary Values

All monetary values in request and response bodies are **integer cents**. Never floats.

- `R$52,90` → `5290`
- `R$0,00` → `0`

### Timestamps

All timestamps in responses are ISO 8601 strings in UTC: `"2025-07-03T14:30:00.000Z"`.

### Authentication Header

All authenticated endpoints require:

```
Authorization: Bearer {access_token}
```

### Store Context

All operational endpoints are scoped to a Store via the URL path. The service layer validates that the authenticated user holds an active Membership at the specified `storeId` before processing any request.

---

# Authentication

## POST /api/v1/auth/login

**Purpose:** Authenticate a user with email and password. Returns an access token and sets a refresh token cookie.

**Authentication required:** No

**Permissions required:** None

**Request Body:**

| Field | Type | Required | Validation |
|---|---|---|---|
| `email` | string | Yes | Valid email format |
| `password` | string | Yes | Non-empty |

**Request Example:**
```json
{
  "email": "joao@marginflow.app",
  "password": "minha-senha-segura"
}
```

**Success Response — 200 OK:**
```json
{
  "data": {
    "accessToken": "eyJhbGciOiJSUzI1NiJ9...",
    "user": {
      "id": "usr_01HXYZ123456",
      "name": "João Silva",
      "email": "joao@marginflow.app",
      "avatarUrl": null,
      "status": "ACTIVE"
    },
    "memberships": [
      {
        "storeId": "str_01HXYZ789",
        "storeName": "Pizza do João — Centro",
        "storeSlug": "pizza-do-joao-centro",
        "status": "ACTIVE",
        "role": {
          "id": "rol_01HXYZ000",
          "name": "OWNER",
          "displayName": "Proprietário",
          "permissions": [
            "orders:create",
            "orders:view",
            "finance:view",
            "settings:edit"
          ]
        }
      }
    ]
  }
}
```

The refresh token is set as an HTTP-only, Secure, SameSite=Strict cookie named `mf_refresh_token`. It is never returned in the response body.

**Error Responses:**

| Status | Code | When |
|---|---|---|
| 401 | `INVALID_CREDENTIALS` | Email not found or password incorrect |
| 403 | `ACCOUNT_SUSPENDED` | The user's account is suspended |
| 403 | `USER_INACTIVE` | The user's status is INACTIVE |
| 422 | `VALIDATION_ERROR` | Missing or invalid fields |

**Business Rules:**
- Failed login attempts do not return information about which field was wrong (to prevent user enumeration).
- A user with status INVITED cannot login until they have set a password via the invitation flow.

**Events Produced:** None

---

## POST /api/v1/auth/logout

**Purpose:** Invalidate the current session. Clears the refresh token cookie.

**Authentication required:** Yes

**Request Body:** None

**Success Response — 204 No Content**

**Events Produced:** None

---

## POST /api/v1/auth/refresh

**Purpose:** Exchange a valid refresh token for a new access token. The refresh token is read from the HTTP-only cookie.

**Authentication required:** No (uses cookie)

**Request Body:** None

**Success Response — 200 OK:**
```json
{
  "data": {
    "accessToken": "eyJhbGciOiJSUzI1NiJ9..."
  }
}
```

**Error Responses:**

| Status | Code | When |
|---|---|---|
| 401 | `REFRESH_TOKEN_MISSING` | No refresh token cookie present |
| 401 | `REFRESH_TOKEN_EXPIRED` | Refresh token has expired |
| 401 | `REFRESH_TOKEN_INVALID` | Refresh token signature is invalid or has been rotated |

**Business Rules:**
- Refresh tokens are rotated on every use. The old token is immediately invalidated.
- Each refresh call issues a new refresh token cookie alongside the new access token.

---

## GET /api/v1/auth/me

**Purpose:** Return the authenticated user's profile and all their store memberships.

**Authentication required:** Yes

**Request Body:** None

**Success Response — 200 OK:**
```json
{
  "data": {
    "user": {
      "id": "usr_01HXYZ123456",
      "name": "João Silva",
      "email": "joao@marginflow.app",
      "phone": "+5511999998888",
      "avatarUrl": null,
      "status": "ACTIVE",
      "lastLoginAt": "2025-07-03T10:00:00.000Z",
      "createdAt": "2025-01-15T09:00:00.000Z"
    },
    "memberships": [
      {
        "storeId": "str_01HXYZ789",
        "storeName": "Pizza do João — Centro",
        "storeSlug": "pizza-do-joao-centro",
        "storeLogoUrl": null,
        "membershipStatus": "ACTIVE",
        "role": {
          "id": "rol_01HXYZ000",
          "name": "OWNER",
          "displayName": "Proprietário",
          "permissions": ["orders:create", "finance:view"]
        }
      }
    ]
  }
}
```

**Events Produced:** None

---

## POST /api/v1/auth/forgot-password

**Purpose:** Send a password reset email to the provided address.

**Authentication required:** No

**Request Body:**

| Field | Type | Required | Validation |
|---|---|---|---|
| `email` | string | Yes | Valid email format |

**Request Example:**
```json
{
  "email": "joao@marginflow.app"
}
```

**Success Response — 200 OK:**
```json
{
  "data": {
    "message": "If an account with this email exists, a reset link has been sent."
  }
}
```

**Business Rules:**
- The response is identical whether the email exists or not (prevents user enumeration).
- Reset tokens expire after 60 minutes.
- Only one active reset token per user at a time. Requesting a new one invalidates the previous.

---

## POST /api/v1/auth/reset-password

**Purpose:** Set a new password using a valid reset token.

**Authentication required:** No

**Request Body:**

| Field | Type | Required | Validation |
|---|---|---|---|
| `token` | string | Yes | Non-empty |
| `password` | string | Yes | Minimum 8 characters |
| `passwordConfirmation` | string | Yes | Must match `password` |

**Request Example:**
```json
{
  "token": "a1b2c3d4e5f6...",
  "password": "nova-senha-forte",
  "passwordConfirmation": "nova-senha-forte"
}
```

**Success Response — 200 OK:**
```json
{
  "data": {
    "message": "Password updated successfully."
  }
}
```

**Error Responses:**

| Status | Code | When |
|---|---|---|
| 400 | `TOKEN_INVALID` | Token not found or already used |
| 400 | `TOKEN_EXPIRED` | Token is older than 60 minutes |
| 422 | `VALIDATION_ERROR` | Passwords do not match or password too short |

---

## POST /api/v1/auth/accept-invitation

**Purpose:** Accept a team invitation and set a password for the invited user.

**Authentication required:** No

**Request Body:**

| Field | Type | Required | Validation |
|---|---|---|---|
| `token` | string | Yes | Invitation token from email |
| `name` | string | Yes | Min 2 characters |
| `password` | string | Yes | Min 8 characters |

**Request Example:**
```json
{
  "token": "inv_token_xyz",
  "name": "Carlos Mendes",
  "password": "primeira-senha"
}
```

**Success Response — 200 OK:**
```json
{
  "data": {
    "accessToken": "eyJhbGciOiJSUzI1NiJ9...",
    "user": {
      "id": "usr_01HXYZ999",
      "name": "Carlos Mendes",
      "email": "carlos@restaurante.com",
      "status": "ACTIVE"
    }
  }
}
```

**Business Rules:**
- Invitation tokens expire after 72 hours.
- Accepting an invitation sets the user's status from INVITED to ACTIVE.
- The user's Membership status changes from INVITED to ACTIVE.
- If the token is expired, the store owner must send a new invitation.

**Events Produced:** `membership.accepted`

---

# Dashboard

## GET /api/v1/stores/:storeId/dashboard

**Purpose:** Return aggregated operational metrics for the store's main dashboard view. All monetary values in cents.

**Authentication required:** Yes

**Permissions required:** `store:view`

**Query Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `date` | string | No | ISO date (YYYY-MM-DD). Defaults to today in the store's timezone. |

**Request Example:**
```
GET /api/v1/stores/str_01HXYZ789/dashboard?date=2025-07-03
```

**Success Response — 200 OK:**
```json
{
  "data": {
    "date": "2025-07-03",
    "timezone": "America/Sao_Paulo",
    "orders": {
      "total": 47,
      "pending": 3,
      "confirmed": 2,
      "preparing": 5,
      "ready": 1,
      "outForDelivery": 8,
      "delivered": 27,
      "cancelled": 1
    },
    "revenue": {
      "gross": 823400,
      "discounts": 12000,
      "deliveryFees": 42000,
      "net": 853400
    },
    "averageOrderValue": 17519,
    "averagePreparationMinutes": 18,
    "averageDeliveryMinutes": 34,
    "topProducts": [
      {
        "productId": "prd_01HXYZ111",
        "productName": "Pizza Margherita Grande",
        "quantitySold": 34,
        "revenue": 179320
      }
    ],
    "activeOrders": [
      {
        "orderId": "ord_01HXYZ001",
        "number": 4821,
        "status": "PREPARING",
        "type": "DELIVERY",
        "customerName": "Maria Silva",
        "grandTotal": 5290,
        "createdAt": "2025-07-03T14:22:00.000Z"
      }
    ]
  }
}
```

**Error Responses:**

| Status | Code | When |
|---|---|---|
| 403 | `STORE_ACCESS_DENIED` | User has no membership at this store |
| 404 | `STORE_NOT_FOUND` | Store does not exist |

**Events Produced:** None (read-only)

---

# Orders

## GET /api/v1/stores/:storeId/orders

**Purpose:** List orders for a store with pagination, filtering, sorting, and full-text search.

**Authentication required:** Yes

**Permissions required:** `orders:view`

**Query Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `1` | Page number (1-indexed) |
| `limit` | integer | `20` | Items per page. Max: 100 |
| `status` | string | — | Filter by status. Accepts comma-separated values: `PENDING,CONFIRMED` |
| `type` | string | — | Filter by type: `DELIVERY`, `TAKEAWAY`, `DINE_IN` |
| `channel` | string | — | Filter by channel: `IN_STORE`, `PHONE`, `MARKETPLACE` |
| `customerId` | string | — | Filter by customer ID |
| `search` | string | — | Full-text search on order number (e.g., `4821`) and customer name |
| `dateFrom` | string | — | ISO date (YYYY-MM-DD). Filter orders created on or after this date (store timezone) |
| `dateTo` | string | — | ISO date (YYYY-MM-DD). Filter orders created on or before this date (store timezone) |
| `sort` | string | `created_at` | Sort field: `created_at`, `grand_total`, `number` |
| `order` | string | `desc` | Sort direction: `asc`, `desc` |

**Request Example:**
```
GET /api/v1/stores/str_01HXYZ789/orders?status=CONFIRMED,PREPARING&type=DELIVERY&page=1&limit=20
```

**Success Response — 200 OK:**
```json
{
  "data": [
    {
      "id": "ord_01HXYZ001",
      "storeId": "str_01HXYZ789",
      "number": 4821,
      "status": "PREPARING",
      "type": "DELIVERY",
      "channel": "PHONE",
      "customerId": "cus_01HXYZ555",
      "customerName": "Maria Silva",
      "customerPhone": "+5511999998888",
      "grandTotal": 5290,
      "itemsTotal": 5290,
      "discountTotal": 0,
      "deliveryFee": 500,
      "scheduledFor": null,
      "createdAt": "2025-07-03T14:22:00.000Z",
      "confirmedAt": "2025-07-03T14:23:00.000Z",
      "readyAt": null,
      "deliveredAt": null,
      "cancelledAt": null
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPreviousPage": false
  }
}
```

**Error Responses:**

| Status | Code | When |
|---|---|---|
| 403 | `STORE_ACCESS_DENIED` | User has no membership at this store |
| 422 | `VALIDATION_ERROR` | Invalid query parameters |

---

## POST /api/v1/stores/:storeId/orders

**Purpose:** Create a new order. Orders are created in DRAFT status and must be explicitly submitted (transitioned to PENDING).

**Authentication required:** Yes

**Permissions required:** `orders:create`

**Request Body:**

| Field | Type | Required | Validation |
|---|---|---|---|
| `type` | string | Yes | `DELIVERY`, `TAKEAWAY`, `DINE_IN` |
| `channel` | string | Yes | `IN_STORE`, `PHONE`, `MARKETPLACE`, `WHATSAPP`, `KIOSK` |
| `customerId` | string | No | Valid customer ID belonging to this store |
| `deliveryAddressId` | string | No | Required when type = DELIVERY. Must belong to the customer |
| `tableNumber` | string | No | Required when type = DINE_IN |
| `notes` | string | No | Max 500 characters |
| `scheduledFor` | string | No | ISO 8601 datetime. Requires store setting `allow_scheduled_orders = true` |
| `items` | array | Yes | Minimum 1 item |
| `items[].productId` | string | Yes | Active product at this store |
| `items[].quantity` | integer | Yes | Minimum 1 |
| `items[].selectedModifiers` | array | No | Array of modifier selections |
| `items[].selectedModifiers[].modifierId` | string | Yes | Active modifier |
| `items[].selectedModifiers[].modifierGroupId` | string | Yes | Parent modifier group |
| `items[].notes` | string | No | Max 200 characters |

**Request Example:**
```json
{
  "type": "DELIVERY",
  "channel": "PHONE",
  "customerId": "cus_01HXYZ555",
  "deliveryAddressId": "adr_01HXYZ333",
  "notes": "Sem cebola",
  "items": [
    {
      "productId": "prd_01HXYZ111",
      "quantity": 1,
      "selectedModifiers": [
        {
          "modifierId": "mod_01HXYZ222",
          "modifierGroupId": "mdg_01HXYZ444"
        }
      ],
      "notes": "Bem assada"
    }
  ]
}
```

**Success Response — 201 Created:**
```json
{
  "data": {
    "id": "ord_01HXYZ001",
    "storeId": "str_01HXYZ789",
    "number": 4821,
    "status": "DRAFT",
    "type": "DELIVERY",
    "channel": "PHONE",
    "customerId": "cus_01HXYZ555",
    "tableNumber": null,
    "deliveryAddress": {
      "street": "Rua das Flores",
      "number": "123",
      "complement": "Apto 4B",
      "neighborhood": "Jardim América",
      "city": "São Paulo",
      "state": "SP",
      "postalCode": "01310-100",
      "country": "BR",
      "latitude": -23.561684,
      "longitude": -46.655981
    },
    "items": [
      {
        "id": "itm_01HXYZ777",
        "productId": "prd_01HXYZ111",
        "productName": "Pizza Margherita",
        "productPrice": 4200,
        "quantity": 1,
        "selectedModifiers": [
          {
            "modifierId": "mod_01HXYZ222",
            "modifierGroupId": "mdg_01HXYZ444",
            "name": "Grande (35cm)",
            "priceAdjustment": 590
          }
        ],
        "unitTotal": 4790,
        "subtotal": 4790,
        "notes": "Bem assada",
        "status": "PENDING"
      }
    ],
    "itemsTotal": 4790,
    "discountTotal": 0,
    "deliveryFee": 500,
    "grandTotal": 5290,
    "notes": "Sem cebola",
    "scheduledFor": null,
    "createdAt": "2025-07-03T14:22:00.000Z",
    "updatedAt": "2025-07-03T14:22:00.000Z"
  }
}
```

**Error Responses:**

| Status | Code | When |
|---|---|---|
| 400 | `PRODUCT_NOT_AVAILABLE` | A product is OUT_OF_STOCK or INACTIVE |
| 400 | `PRODUCT_NOT_FOUND` | A product ID does not belong to this store |
| 400 | `MODIFIER_VALIDATION_FAILED` | A required modifier group has no selection, or max_selections exceeded |
| 400 | `CUSTOMER_BLOCKED` | The specified customer has status BLOCKED |
| 400 | `ADDRESS_NOT_FOUND` | The delivery address does not belong to the customer |
| 400 | `DELIVERY_ADDRESS_REQUIRED` | type = DELIVERY but no address provided |
| 400 | `SCHEDULED_ORDERS_DISABLED` | scheduledFor provided but store setting is off |
| 400 | `SCHEDULED_TOO_FAR` | scheduledFor exceeds max_scheduled_days_ahead |
| 403 | `STORE_ACCESS_DENIED` | User has no membership at this store |
| 422 | `VALIDATION_ERROR` | Missing or invalid fields |

**Validation Rules:**
- `items` must contain at least 1 entry.
- Each `items[].quantity` must be ≥ 1.
- For each required modifier group attached to a product, at least `min_selections` and at most `max_selections` modifiers must be selected.
- `grand_total = items_total − discount_total + delivery_fee` is computed server-side. Clients must not send totals.
- Product prices and modifier prices are read from the database at creation time and snapshotted. Client-provided prices are ignored.

**Business Rules:**
- The order number is generated atomically per store (no gaps, no duplicates).
- The delivery address JSONB snapshot is copied from the Address record at creation time.
- Product names, prices, and modifier data are snapshotted at creation time.

**Events Produced:** `order.created`

---

## GET /api/v1/stores/:storeId/orders/:orderId

**Purpose:** Retrieve a single order with all items, status history, and related records.

**Authentication required:** Yes

**Permissions required:** `orders:view`

**Success Response — 200 OK:**
```json
{
  "data": {
    "id": "ord_01HXYZ001",
    "storeId": "str_01HXYZ789",
    "number": 4821,
    "status": "CONFIRMED",
    "type": "DELIVERY",
    "channel": "PHONE",
    "customerId": "cus_01HXYZ555",
    "customer": {
      "id": "cus_01HXYZ555",
      "name": "Maria Silva",
      "phone": "+5511999998888"
    },
    "tableNumber": null,
    "deliveryAddress": {
      "street": "Rua das Flores",
      "number": "123",
      "complement": "Apto 4B",
      "neighborhood": "Jardim América",
      "city": "São Paulo",
      "state": "SP",
      "postalCode": "01310-100",
      "country": "BR",
      "latitude": -23.561684,
      "longitude": -46.655981
    },
    "items": [
      {
        "id": "itm_01HXYZ777",
        "productId": "prd_01HXYZ111",
        "productName": "Pizza Margherita",
        "productPrice": 4200,
        "quantity": 1,
        "selectedModifiers": [
          {
            "modifierId": "mod_01HXYZ222",
            "modifierGroupId": "mdg_01HXYZ444",
            "name": "Grande (35cm)",
            "priceAdjustment": 590
          }
        ],
        "unitTotal": 4790,
        "subtotal": 4790,
        "notes": "Bem assada",
        "status": "PREPARING"
      }
    ],
    "itemsTotal": 4790,
    "discountTotal": 0,
    "deliveryFee": 500,
    "grandTotal": 5290,
    "notes": "Sem cebola",
    "scheduledFor": null,
    "statusHistory": [
      {
        "status": "DRAFT",
        "triggeredByUserId": "usr_01HXYZ123456",
        "notes": null,
        "occurredAt": "2025-07-03T14:22:00.000Z"
      },
      {
        "status": "PENDING",
        "triggeredByUserId": "usr_01HXYZ123456",
        "notes": null,
        "occurredAt": "2025-07-03T14:22:30.000Z"
      },
      {
        "status": "CONFIRMED",
        "triggeredByUserId": "usr_01HXYZ123456",
        "notes": null,
        "occurredAt": "2025-07-03T14:23:00.000Z"
      }
    ],
    "kitchenTicketId": "tkt_01HXYZ888",
    "paymentId": null,
    "deliveryId": null,
    "cancelledReason": null,
    "cancelledByUserId": null,
    "confirmedAt": "2025-07-03T14:23:00.000Z",
    "readyAt": null,
    "deliveredAt": null,
    "cancelledAt": null,
    "createdAt": "2025-07-03T14:22:00.000Z",
    "updatedAt": "2025-07-03T14:23:00.000Z"
  }
}
```

**Error Responses:**

| Status | Code | When |
|---|---|---|
| 403 | `STORE_ACCESS_DENIED` | User has no membership at this store |
| 404 | `ORDER_NOT_FOUND` | Order does not exist in this store |

---

## PATCH /api/v1/stores/:storeId/orders/:orderId

**Purpose:** Update mutable fields of an order. Only allowed while the order is in DRAFT or PENDING status. After CONFIRMED, the order is frozen.

**Authentication required:** Yes

**Permissions required:** `orders:edit`

**Allowed when status is:** `DRAFT`, `PENDING`

**Forbidden when status is:** `CONFIRMED`, `PREPARING`, `READY`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED`

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `notes` | string | No | Order-level customer instructions |
| `scheduledFor` | string | No | ISO 8601 datetime or null |
| `tableNumber` | string | No | Dine-in table identifier |
| `deliveryAddressId` | string | No | Update delivery address (DELIVERY orders only) |

**Request Example:**
```json
{
  "notes": "Campainha não funciona, ligar para interfone 12",
  "scheduledFor": null
}
```

**Success Response — 200 OK:**
Returns the updated order object (same shape as GET /orders/:orderId).

**Error Responses:**

| Status | Code | When |
|---|---|---|
| 409 | `ORDER_NOT_EDITABLE` | Order status is beyond PENDING |
| 404 | `ORDER_NOT_FOUND` | Order does not exist |

**Business Rules:**
- Items cannot be modified via this endpoint. Use the order items endpoints.
- Grand total is recomputed if delivery address changes the delivery fee (future).

**Events Produced:** `order.updated`

---

## POST /api/v1/stores/:storeId/orders/:orderId/status

**Purpose:** Transition an order through the status transitions that Orders itself owns. Enforces the one-directional status machine. Records the transition in the audit log.

**Ownership note:** This endpoint is **not** the entry point for every status the `orders.status` field can hold. `PREPARING`, `READY`, and `OUT_FOR_DELIVERY` are system-derived — they are set exclusively by the Orders service in reaction to `kitchen_ticket.ready`, `delivery.dispatched`, and `delivery.delivered` events (see `POST /kitchen/tickets/:ticketId/status` and `POST /deliveries/:deliveryId/status` below). Calling this endpoint with one of those three statuses as the target returns `400 INVALID_TRANSITION`. This split exists so that Kitchen and Delivery each remain the single owner of their own transitions — the Orders module never reaches into Kitchen Ticket or Delivery state directly, only through the events they publish.

**Authentication required:** Yes

**Permissions required:** Varies by transition — see table below.

**Request Body:**

| Field | Type | Required | Validation |
|---|---|---|---|
| `status` | string | Yes | Target status |
| `reason` | string | Conditional | Required when transitioning to CANCELLED |
| `notes` | string | No | Optional operator notes for the audit log |

**Allowed Transitions:**

| From | To | Permissions Required | Side Effects |
|---|---|---|---|
| `DRAFT` | `PENDING` | `orders:create` | None |
| `PENDING` | `CONFIRMED` | `orders:edit` | Creates Kitchen Ticket; emits `order.confirmed`; if `auto_confirm_orders = true`, this happens automatically |
| `READY` | `DELIVERED` | `orders:edit` | TAKEAWAY orders only — there is no Delivery record for this order type, so Orders is the sole owner of the pickup confirmation. Emits `order.delivered` directly. |
| Any (before DELIVERED) | `CANCELLED` | `orders:cancel` | Emits `order.cancelled`. Kitchen consumes it and cancels the Kitchen Ticket. Delivery consumes it and cancels/fails the Delivery record. If the Delivery has already reached `DISPATCHED` or later, cancellation additionally requires the acting user to hold manager-level `delivery:update_status`; if absent, the whole request is rejected with `409 DISPATCHED_DELIVERY_CANCEL_REQUIRES_MANAGER` before any state changes. (This check can still block the caller's response today because the event bus is synchronous and in-process — see the note under Event Contracts on what must change if the bus becomes asynchronous.) |

**System-derived transitions (not callable via this endpoint):**

| From | To | Actually triggered by | Producing event |
|---|---|---|---|
| `CONFIRMED` | `PREPARING` | `POST /kitchen/tickets/:ticketId/status` (QUEUED → PREPARING) | `kitchen_ticket.status_changed` |
| `PREPARING` | `READY` | `POST /kitchen/tickets/:ticketId/status` (PREPARING → READY) | `kitchen_ticket.ready` |
| `READY` | `OUT_FOR_DELIVERY` | `POST /deliveries/:deliveryId/status` (AWAITING_PICKUP → DISPATCHED) | `delivery.dispatched` |
| `OUT_FOR_DELIVERY` | `DELIVERED` | `POST /deliveries/:deliveryId/status` (→ DELIVERED) | `delivery.delivered` |

**Forbidden Transitions:**

This table describes the overall system-wide state machine spanning the Orders, Kitchen, and Delivery endpoints together — not only the transitions this endpoint itself accepts.

| Attempt | Reason |
|---|---|
| Any status → any earlier status | Status machine is strictly one-directional |
| `DELIVERED` → any | Delivered orders are final and immutable |
| `CANCELLED` → any | Cancelled orders cannot be uncancelled |
| `PENDING` → `PREPARING` | Must pass through CONFIRMED first |
| `CONFIRMED` → `DELIVERED` | Must pass through READY |

**Request Example — Confirm an order:**
```json
{
  "status": "CONFIRMED"
}
```

**Request Example — Cancel an order:**
```json
{
  "status": "CANCELLED",
  "reason": "Cliente desistiu da compra",
  "notes": "Ligou pedindo cancelamento"
}
```

**Success Response — 200 OK:**
Returns the updated order object.

**Error Responses:**

| Status | Code | When |
|---|---|---|
| 400 | `INVALID_TRANSITION` | The requested transition is not allowed |
| 400 | `CANCELLATION_REASON_REQUIRED` | Transitioning to CANCELLED without a reason |
| 403 | `INSUFFICIENT_PERMISSIONS` | User's role does not have the required permission for this transition |
| 409 | `ORDER_ALREADY_DELIVERED` | Cannot transition a delivered order |
| 409 | `ORDER_ALREADY_CANCELLED` | Cannot transition a cancelled order |
| 409 | `DISPATCHED_DELIVERY_CANCEL_REQUIRES_MANAGER` | Cancelling a dispatched delivery requires manager role |

**Business Rules:**
- All transitions — whether triggered here or derived from Kitchen/Delivery events — are recorded in `order_status_transitions` with the actor's user ID (or `null` for system-triggered transitions) and the timestamp.
- Operational timestamps (`confirmed_at`, `ready_at`, `delivered_at`, `cancelled_at`) are set once and never overwritten, regardless of whether the transition was client-triggered or event-derived.
- Order status follows Kitchen Ticket and Delivery status automatically, via the domain events listed in the "System-derived transitions" table above. This endpoint never mutates those three statuses directly.
- `grand_total` cannot change after an order reaches CONFIRMED.

**Events Produced (by this endpoint):**
- `order.confirmed` when status → CONFIRMED
- `order.delivered` when status → DELIVERED (TAKEAWAY pickup path only; for DELIVERY orders this event is instead produced by the Orders service after consuming `delivery.delivered` — see Event Contracts)
- `order.cancelled` when status → CANCELLED

`order.ready` and `order.out_for_delivery` are never produced by this endpoint — they are produced by the Orders service in the background after consuming `kitchen_ticket.ready` and `delivery.dispatched` respectively. See Event Contracts.

---

## POST /api/v1/stores/:storeId/orders/:orderId/items

**Purpose:** Add a new item to an order. Only allowed in DRAFT or PENDING status.

**Authentication required:** Yes

**Permissions required:** `orders:edit`

**Request Body:**

| Field | Type | Required | Validation |
|---|---|---|---|
| `productId` | string | Yes | Active product at this store |
| `quantity` | integer | Yes | Minimum 1 |
| `selectedModifiers` | array | No | Modifier selections |
| `notes` | string | No | Max 200 characters |

**Request Example:**
```json
{
  "productId": "prd_01HXYZ999",
  "quantity": 2,
  "selectedModifiers": [],
  "notes": null
}
```

**Success Response — 201 Created:**
Returns the created order item and the updated order totals.

**Error Responses:**

| Status | Code | When |
|---|---|---|
| 409 | `ORDER_NOT_EDITABLE` | Order is not in DRAFT or PENDING status |
| 400 | `PRODUCT_NOT_AVAILABLE` | Product is inactive or out of stock |

**Business Rules:**
- Adding an item recomputes `items_total` and `grand_total`.
- Product name, price, and modifier data are snapshotted at addition time.

**Events Produced:** `order.updated`

---

## PATCH /api/v1/stores/:storeId/orders/:orderId/items/:itemId

**Purpose:** Update quantity or notes on an existing order item. Only allowed in DRAFT or PENDING status.

**Authentication required:** Yes

**Permissions required:** `orders:edit`

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `quantity` | integer | No | New quantity. Must be ≥ 1 |
| `notes` | string | No | New item-level notes |

**Request Example:**
```json
{
  "quantity": 3
}
```

**Success Response — 200 OK:**
Returns the updated order item and the updated order totals.

**Error Responses:**

| Status | Code | When |
|---|---|---|
| 409 | `ORDER_NOT_EDITABLE` | Order is not in DRAFT or PENDING status |
| 404 | `ITEM_NOT_FOUND` | Item does not belong to this order |

---

## DELETE /api/v1/stores/:storeId/orders/:orderId/items/:itemId

**Purpose:** Remove an item from an order. Only allowed in DRAFT or PENDING status.

**Authentication required:** Yes

**Permissions required:** `orders:edit`

**Delete behavior:** Hard delete. Order items are only removed while the order is still in draft state. Once confirmed, items are permanent.

**Success Response — 204 No Content**

**Error Responses:**

| Status | Code | When |
|---|---|---|
| 409 | `ORDER_NOT_EDITABLE` | Order is not in DRAFT or PENDING status |
| 409 | `CANNOT_REMOVE_LAST_ITEM` | Removing this item would leave the order empty |
| 404 | `ITEM_NOT_FOUND` | Item does not belong to this order |

**Business Rules:**
- An order must always contain at least one item. Removing the last item is forbidden.
- Removing an item recomputes `items_total` and `grand_total`.

---

## GET /api/v1/stores/:storeId/orders/:orderId/timeline

**Purpose:** Return the complete status transition history for an order.

**Authentication required:** Yes

**Permissions required:** `orders:view`

**Success Response — 200 OK:**
```json
{
  "data": [
    {
      "id": "trs_01HXYZ111",
      "status": "DRAFT",
      "triggeredByUser": {
        "id": "usr_01HXYZ123456",
        "name": "João Silva"
      },
      "notes": null,
      "occurredAt": "2025-07-03T14:22:00.000Z"
    },
    {
      "id": "trs_01HXYZ112",
      "status": "PENDING",
      "triggeredByUser": {
        "id": "usr_01HXYZ123456",
        "name": "João Silva"
      },
      "notes": null,
      "occurredAt": "2025-07-03T14:22:30.000Z"
    },
    {
      "id": "trs_01HXYZ113",
      "status": "CONFIRMED",
      "triggeredByUser": null,
      "notes": "Auto-confirmado pelo sistema",
      "occurredAt": "2025-07-03T14:23:00.000Z"
    }
  ]
}
```

---

# Products — Categories

## GET /api/v1/stores/:storeId/categories

**Purpose:** List all categories for a store, ordered by sort_order.

**Authentication required:** Yes

**Permissions required:** `products:view`

**Query Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `isActive` | boolean | — | Filter by active/inactive status |
| `search` | string | — | Filter by name (partial match) |

**Success Response — 200 OK:**
```json
{
  "data": [
    {
      "id": "cat_01HXYZ100",
      "storeId": "str_01HXYZ789",
      "name": "Pizzas",
      "description": "Nossas pizzas tradicionais",
      "imageUrl": "https://cdn.marginflow.app/cat_01HXYZ100.jpg",
      "sortOrder": 1,
      "isActive": true,
      "productCount": 8,
      "createdAt": "2025-01-20T10:00:00.000Z",
      "updatedAt": "2025-01-20T10:00:00.000Z"
    }
  ]
}
```

---

## POST /api/v1/stores/:storeId/categories

**Purpose:** Create a new category for the store's catalog.

**Authentication required:** Yes

**Permissions required:** `products:create`

**Request Body:**

| Field | Type | Required | Validation |
|---|---|---|---|
| `name` | string | Yes | Min 2, max 80 characters. Unique per store |
| `description` | string | No | Max 500 characters |
| `imageUrl` | string | No | Valid URL |
| `sortOrder` | integer | No | Default: last position |
| `isActive` | boolean | No | Default: `true` |

**Request Example:**
```json
{
  "name": "Pizzas",
  "description": "Nossas pizzas tradicionais",
  "sortOrder": 1,
  "isActive": true
}
```

**Success Response — 201 Created:**
Returns the created category object.

**Error Responses:**

| Status | Code | When |
|---|---|---|
| 409 | `CATEGORY_NAME_TAKEN` | A category with this name already exists at this store |
| 422 | `VALIDATION_ERROR` | Invalid fields |

---

## GET /api/v1/stores/:storeId/categories/:categoryId

**Purpose:** Retrieve a single category.

**Authentication required:** Yes

**Permissions required:** `products:view`

**Success Response — 200 OK:**
Returns the category object with `productCount`.

---

## PATCH /api/v1/stores/:storeId/categories/:categoryId

**Purpose:** Update a category's fields.

**Authentication required:** Yes

**Permissions required:** `products:edit`

**Request Body:** Any subset of: `name`, `description`, `imageUrl`, `sortOrder`, `isActive`

**Success Response — 200 OK:**
Returns the updated category object.

**Error Responses:**

| Status | Code | When |
|---|---|---|
| 409 | `CATEGORY_NAME_TAKEN` | New name already used by another category |
| 404 | `CATEGORY_NOT_FOUND` | Category does not exist in this store |

---

## DELETE /api/v1/stores/:storeId/categories/:categoryId

**Purpose:** Soft-delete a category.

**Authentication required:** Yes

**Permissions required:** `products:delete`

**Delete behavior:** Soft delete — sets `deleted_at`. The category is hidden from all interfaces immediately. The record is retained in the database for historical integrity.

**Cascade behavior:** None. Deletion is blocked if any active product belongs to this category.

**Success Response — 204 No Content**

**Error Responses:**

| Status | Code | When |
|---|---|---|
| 409 | `CATEGORY_HAS_ACTIVE_PRODUCTS` | Cannot delete a category that has active products. Reassign or deactivate all products first. |
| 404 | `CATEGORY_NOT_FOUND` | Category does not exist |

---

# Products — Products

## GET /api/v1/stores/:storeId/products

**Purpose:** List products for a store. Supports filtering, sorting, and search.

**Authentication required:** Yes

**Permissions required:** `products:view`

**Query Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `1` | Page number |
| `limit` | integer | `20` | Max 100 |
| `categoryId` | string | — | Filter by category |
| `status` | string | — | `ACTIVE`, `INACTIVE`, `OUT_OF_STOCK` |
| `type` | string | — | `SIMPLE`, `COMBO`, `SERVICE_CHARGE` |
| `search` | string | — | Search by name or SKU |
| `sort` | string | `sort_order` | `sort_order`, `name`, `price`, `created_at` |
| `order` | string | `asc` | `asc`, `desc` |

**Success Response — 200 OK:**
```json
{
  "data": [
    {
      "id": "prd_01HXYZ111",
      "storeId": "str_01HXYZ789",
      "categoryId": "cat_01HXYZ100",
      "categoryName": "Pizzas",
      "name": "Pizza Margherita",
      "description": "Molho de tomate, mussarela, manjericão fresco",
      "price": 4200,
      "imageUrl": "https://cdn.marginflow.app/prd_01HXYZ111.jpg",
      "sku": "PIZ-MAR-001",
      "type": "SIMPLE",
      "status": "ACTIVE",
      "isAvailable": true,
      "sortOrder": 1,
      "modifierGroupCount": 2,
      "createdAt": "2025-01-20T10:00:00.000Z",
      "updatedAt": "2025-01-20T10:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 12, "totalPages": 1, "hasNextPage": false, "hasPreviousPage": false }
}
```

---

## POST /api/v1/stores/:storeId/products

**Purpose:** Create a new product in the store's catalog.

**Authentication required:** Yes

**Permissions required:** `products:create`

**Request Body:**

| Field | Type | Required | Validation |
|---|---|---|---|
| `categoryId` | string | Yes | Active category at this store |
| `name` | string | Yes | Min 2, max 120 characters |
| `description` | string | No | Max 1000 characters |
| `price` | integer | Yes | ≥ 0 (cents) |
| `imageUrl` | string | No | Valid URL |
| `sku` | string | No | Max 50 characters. Unique per store if provided |
| `type` | string | No | Default: `SIMPLE` |
| `status` | string | No | Default: `ACTIVE` |
| `sortOrder` | integer | No | Default: last position |
| `availabilitySchedule` | object | No | WeeklySchedule object. null = always available |

**Request Example:**
```json
{
  "categoryId": "cat_01HXYZ100",
  "name": "Pizza Margherita",
  "description": "Molho de tomate, mussarela, manjericão fresco",
  "price": 4200,
  "sku": "PIZ-MAR-001",
  "type": "SIMPLE",
  "status": "ACTIVE",
  "availabilitySchedule": null
}
```

**Success Response — 201 Created:**
Returns the created product object.

**Error Responses:**

| Status | Code | When |
|---|---|---|
| 400 | `CATEGORY_NOT_FOUND` | Category does not exist or belongs to another store |
| 409 | `SKU_TAKEN` | SKU already used by another product in this store |
| 422 | `VALIDATION_ERROR` | Invalid fields |

---

## GET /api/v1/stores/:storeId/products/:productId

**Purpose:** Retrieve a single product with all modifier groups and modifiers.

**Authentication required:** Yes

**Permissions required:** `products:view`

**Success Response — 200 OK:**
```json
{
  "data": {
    "id": "prd_01HXYZ111",
    "storeId": "str_01HXYZ789",
    "categoryId": "cat_01HXYZ100",
    "name": "Pizza Margherita",
    "description": "Molho de tomate, mussarela, manjericão fresco",
    "price": 4200,
    "imageUrl": null,
    "sku": "PIZ-MAR-001",
    "type": "SIMPLE",
    "status": "ACTIVE",
    "isAvailable": true,
    "availabilitySchedule": null,
    "sortOrder": 1,
    "modifierGroups": [
      {
        "id": "mdg_01HXYZ444",
        "name": "Escolha o tamanho",
        "description": null,
        "isRequired": true,
        "minSelections": 1,
        "maxSelections": 1,
        "sortOrder": 1,
        "isActive": true,
        "modifiers": [
          {
            "id": "mod_01HXYZ221",
            "name": "Média (30cm)",
            "priceAdjustment": 0,
            "sku": null,
            "sortOrder": 1,
            "isActive": true
          },
          {
            "id": "mod_01HXYZ222",
            "name": "Grande (35cm)",
            "priceAdjustment": 590,
            "sku": null,
            "sortOrder": 2,
            "isActive": true
          }
        ]
      }
    ],
    "deletedAt": null,
    "createdAt": "2025-01-20T10:00:00.000Z",
    "updatedAt": "2025-01-20T10:00:00.000Z"
  }
}
```

---

## PATCH /api/v1/stores/:storeId/products/:productId

**Purpose:** Update a product's fields.

**Authentication required:** Yes

**Permissions required:** `products:edit`

**Request Body:** Any subset of: `name`, `description`, `price`, `imageUrl`, `sku`, `categoryId`, `type`, `status`, `sortOrder`, `availabilitySchedule`

**Success Response — 200 OK:** Returns the updated product object.

**Business Rules:**
- Changing a product's price does not affect existing orders (those use the snapshotted price).
- Changing a product's status to OUT_OF_STOCK immediately blocks it from new orders.

**Events Produced:** `product.updated`

---

## DELETE /api/v1/stores/:storeId/products/:productId

**Purpose:** Soft-delete a product.

**Authentication required:** Yes

**Permissions required:** `products:delete`

**Delete behavior:** Soft delete — sets `deleted_at`. The product is immediately hidden from all menus and the ordering interface. The record is retained for historical order integrity. `product_id` on historical Order Items becomes a preserved soft reference.

**Cascade behavior:** Soft-deletes cascade to all associated Modifier Groups and Modifiers (they are also hidden). Historical Order Item snapshots are not affected.

**Success Response — 204 No Content**

**Error Responses:**

| Status | Code | When |
|---|---|---|
| 404 | `PRODUCT_NOT_FOUND` | Product does not exist in this store |

---

# Products — Modifier Groups

## GET /api/v1/stores/:storeId/products/:productId/modifier-groups

**Purpose:** List all modifier groups for a product.

**Authentication required:** Yes

**Permissions required:** `products:view`

**Success Response — 200 OK:**
Returns an array of modifier group objects, each including their modifiers.

---

## POST /api/v1/stores/:storeId/products/:productId/modifier-groups

**Purpose:** Create a new modifier group for a product.

**Authentication required:** Yes

**Permissions required:** `products:create`

**Request Body:**

| Field | Type | Required | Validation |
|---|---|---|---|
| `name` | string | Yes | Min 2, max 80 characters. Unique per product |
| `description` | string | No | Max 300 characters |
| `isRequired` | boolean | Yes | Whether customer must select |
| `minSelections` | integer | Yes | ≥ 0, ≤ maxSelections |
| `maxSelections` | integer | Yes | ≥ 1 |
| `sortOrder` | integer | No | Default: last |
| `isActive` | boolean | No | Default: `true` |

**Request Example:**
```json
{
  "name": "Escolha o tamanho",
  "isRequired": true,
  "minSelections": 1,
  "maxSelections": 1,
  "sortOrder": 1
}
```

**Success Response — 201 Created:**
Returns the created modifier group object.

**Error Responses:**

| Status | Code | When |
|---|---|---|
| 400 | `MIN_GT_MAX_SELECTIONS` | minSelections > maxSelections |
| 409 | `GROUP_NAME_TAKEN` | Modifier group name already exists for this product |

---

## PATCH /api/v1/stores/:storeId/products/:productId/modifier-groups/:groupId

**Purpose:** Update a modifier group's fields.

**Authentication required:** Yes

**Permissions required:** `products:edit`

**Request Body:** Any subset of: `name`, `description`, `isRequired`, `minSelections`, `maxSelections`, `sortOrder`, `isActive`

**Success Response — 200 OK:** Returns the updated modifier group.

---

## DELETE /api/v1/stores/:storeId/products/:productId/modifier-groups/:groupId

**Purpose:** Soft-delete a modifier group.

**Authentication required:** Yes

**Permissions required:** `products:delete`

**Delete behavior:** Soft delete. Cascades to all modifiers in the group. Historical order snapshots are not affected.

**Success Response — 204 No Content**

---

# Products — Modifiers

## GET /api/v1/stores/:storeId/products/:productId/modifier-groups/:groupId/modifiers

**Purpose:** List all modifiers within a modifier group.

**Authentication required:** Yes

**Permissions required:** `products:view`

**Success Response — 200 OK:**
```json
{
  "data": [
    {
      "id": "mod_01HXYZ221",
      "modifierGroupId": "mdg_01HXYZ444",
      "name": "Média (30cm)",
      "priceAdjustment": 0,
      "sku": null,
      "sortOrder": 1,
      "isActive": true
    },
    {
      "id": "mod_01HXYZ222",
      "modifierGroupId": "mdg_01HXYZ444",
      "name": "Grande (35cm)",
      "priceAdjustment": 590,
      "sku": null,
      "sortOrder": 2,
      "isActive": true
    }
  ]
}
```

---

## POST /api/v1/stores/:storeId/products/:productId/modifier-groups/:groupId/modifiers

**Purpose:** Add a modifier option to a modifier group.

**Authentication required:** Yes

**Permissions required:** `products:create`

**Request Body:**

| Field | Type | Required | Validation |
|---|---|---|---|
| `name` | string | Yes | Unique per modifier group |
| `priceAdjustment` | integer | No | Default: 0. Can be negative |
| `sku` | string | No | |
| `sortOrder` | integer | No | Default: last |
| `isActive` | boolean | No | Default: `true` |

**Request Example:**
```json
{
  "name": "Borda Recheada",
  "priceAdjustment": 800,
  "sortOrder": 3
}
```

**Success Response — 201 Created:**
Returns the created modifier.

---

## PATCH /api/v1/stores/:storeId/products/:productId/modifier-groups/:groupId/modifiers/:modifierId

**Purpose:** Update a modifier.

**Authentication required:** Yes

**Permissions required:** `products:edit`

**Request Body:** Any subset of: `name`, `priceAdjustment`, `sku`, `sortOrder`, `isActive`

**Business Rules:**
- Changing a modifier's `priceAdjustment` does not affect existing orders.

**Success Response — 200 OK:** Returns the updated modifier.

---

## DELETE /api/v1/stores/:storeId/products/:productId/modifier-groups/:groupId/modifiers/:modifierId

**Purpose:** Soft-delete a modifier.

**Authentication required:** Yes

**Permissions required:** `products:delete`

**Delete behavior:** Soft delete. Historical order item snapshots retain the modifier data permanently.

**Success Response — 204 No Content**

---

# Products — Menus

## GET /api/v1/stores/:storeId/menus

**Purpose:** List all menus for a store.

**Authentication required:** Yes

**Permissions required:** `menu:view`

**Query Parameters:** `status` (filter), `channel` (filter)

**Success Response — 200 OK:**
```json
{
  "data": [
    {
      "id": "mnu_01HXYZ200",
      "storeId": "str_01HXYZ789",
      "name": "Cardápio Delivery",
      "description": null,
      "status": "ACTIVE",
      "channel": "DELIVERY",
      "availabilitySchedule": null,
      "sectionCount": 4,
      "createdAt": "2025-01-20T10:00:00.000Z",
      "updatedAt": "2025-01-20T10:00:00.000Z"
    }
  ]
}
```

---

## POST /api/v1/stores/:storeId/menus

**Purpose:** Create a new menu.

**Authentication required:** Yes

**Permissions required:** `menu:create`

**Request Body:**

| Field | Type | Required | Validation |
|---|---|---|---|
| `name` | string | Yes | Unique per store |
| `description` | string | No | |
| `channel` | string | Yes | `DELIVERY`, `IN_STORE`, `MARKETPLACE`, `KIOSK` |
| `status` | string | No | Default: `INACTIVE` — menus start inactive and must be published |
| `availabilitySchedule` | object | No | WeeklySchedule or null |

**Request Example:**
```json
{
  "name": "Cardápio Delivery",
  "channel": "DELIVERY",
  "status": "INACTIVE"
}
```

**Success Response — 201 Created:** Returns the created menu.

---

## GET /api/v1/stores/:storeId/menus/:menuId

**Purpose:** Retrieve a menu with its ordered sections and associated categories.

**Authentication required:** Yes

**Permissions required:** `menu:view`

**Success Response — 200 OK:**
```json
{
  "data": {
    "id": "mnu_01HXYZ200",
    "name": "Cardápio Delivery",
    "status": "ACTIVE",
    "channel": "DELIVERY",
    "availabilitySchedule": null,
    "sections": [
      {
        "sortOrder": 1,
        "isVisible": true,
        "category": {
          "id": "cat_01HXYZ100",
          "name": "Pizzas",
          "imageUrl": null
        }
      }
    ]
  }
}
```

---

## PATCH /api/v1/stores/:storeId/menus/:menuId

**Purpose:** Update menu fields other than its publish status.

**Authentication required:** Yes

**Permissions required:** `menu:edit`

**Request Body:** Any subset of: `name`, `description`, `availabilitySchedule`

**Business Rules:**
- `status` is not a valid field on this endpoint. Use `POST /menus/:menuId/publish` or `POST /menus/:menuId/unpublish` to change it — this keeps Menu consistent with how Order, Kitchen Ticket, and Delivery model status transitions as dedicated action endpoints with their own permission, rather than as an implicit side effect of a general-purpose PATCH.

**Error Responses:**

| Status | Code | When |
|---|---|---|
| 422 | `VALIDATION_ERROR` | Request body includes `status` |
| 404 | `MENU_NOT_FOUND` | Menu does not exist in this store |

---

## POST /api/v1/stores/:storeId/menus/:menuId/publish

**Purpose:** Activate a menu, making it visible to its ordering channel.

**Authentication required:** Yes

**Permissions required:** `menu:publish`

**Request Body:** None

**Success Response — 200 OK:** Returns the updated menu with `status: "ACTIVE"`.

**Error Responses:**

| Status | Code | When |
|---|---|---|
| 403 | `INSUFFICIENT_PERMISSIONS` | User holds `menu:edit` but not `menu:publish` |
| 409 | `MENU_ALREADY_ACTIVE` | Menu is already ACTIVE |
| 404 | `MENU_NOT_FOUND` | Menu does not exist in this store |

**Events Produced:** `menu.published`

---

## POST /api/v1/stores/:storeId/menus/:menuId/unpublish

**Purpose:** Deactivate a menu, hiding it from its ordering channel without deleting it.

**Authentication required:** Yes

**Permissions required:** `menu:publish`

**Request Body:** None

**Success Response — 200 OK:** Returns the updated menu with `status: "INACTIVE"`.

**Error Responses:**

| Status | Code | When |
|---|---|---|
| 403 | `INSUFFICIENT_PERMISSIONS` | User holds `menu:edit` but not `menu:publish` |
| 409 | `MENU_NOT_ACTIVE` | Menu is not currently ACTIVE |
| 404 | `MENU_NOT_FOUND` | Menu does not exist in this store |

**Events Produced:** `menu.unpublished`

---

## PUT /api/v1/stores/:storeId/menus/:menuId/sections

**Purpose:** Replace the complete set of sections for a menu. This is a replace-all operation — send the full desired section list.

**Authentication required:** Yes

**Permissions required:** `menu:edit`

**Request Body:**

```json
{
  "sections": [
    { "categoryId": "cat_01HXYZ100", "sortOrder": 1, "isVisible": true },
    { "categoryId": "cat_01HXYZ101", "sortOrder": 2, "isVisible": true },
    { "categoryId": "cat_01HXYZ102", "sortOrder": 3, "isVisible": false }
  ]
}
```

**Success Response — 200 OK:** Returns the updated menu with sections.

**Business Rules:**
- Omitting a category from the sections array removes it from the menu.
- Categories must belong to this store.

---

## DELETE /api/v1/stores/:storeId/menus/:menuId

**Purpose:** Delete a menu.

**Authentication required:** Yes

**Permissions required:** `menu:edit`

**Delete behavior:** Hard delete. Menus have no historical significance — they are configuration documents.

**Cascade behavior:** Deletes all associated menu sections. No other data is affected.

**Success Response — 204 No Content**

---

# Customers

## GET /api/v1/stores/:storeId/customers

**Purpose:** List customers for a store with pagination, filtering, and search.

**Authentication required:** Yes

**Permissions required:** `customers:view`

**Query Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `1` | |
| `limit` | integer | `20` | Max 100 |
| `status` | string | — | `ACTIVE`, `BLOCKED` |
| `search` | string | — | Search by name or phone (partial match) |
| `sort` | string | `last_order_at` | `name`, `last_order_at`, `total_spent`, `total_orders`, `created_at` |
| `order` | string | `desc` | |

**Success Response — 200 OK:**
```json
{
  "data": [
    {
      "id": "cus_01HXYZ555",
      "storeId": "str_01HXYZ789",
      "name": "Maria Silva",
      "phone": "+5511999998888",
      "email": "maria@email.com",
      "status": "ACTIVE",
      "totalOrders": 14,
      "totalSpent": 74260,
      "firstOrderAt": "2025-02-01T18:30:00.000Z",
      "lastOrderAt": "2025-07-03T14:22:00.000Z",
      "createdAt": "2025-02-01T18:30:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 342, "totalPages": 18, "hasNextPage": true, "hasPreviousPage": false }
}
```

---

## POST /api/v1/stores/:storeId/customers

**Purpose:** Create a new customer record for the store.

**Authentication required:** Yes

**Permissions required:** `customers:create`

**Request Body:**

| Field | Type | Required | Validation |
|---|---|---|---|
| `name` | string | Yes | Min 2, max 120 characters |
| `phone` | string | Yes | Valid phone format. Unique per store |
| `email` | string | No | Valid email format |
| `taxId` | string | No | CPF format (11 digits) |
| `notes` | string | No | Max 500 characters |

**Request Example:**
```json
{
  "name": "Carlos Mendes",
  "phone": "+5511977773333",
  "email": null,
  "notes": "Alérgico a camarão"
}
```

**Success Response — 201 Created:** Returns the created customer.

**Error Responses:**

| Status | Code | When |
|---|---|---|
| 409 | `PHONE_ALREADY_REGISTERED` | Phone number already used by another customer at this store |
| 422 | `VALIDATION_ERROR` | Invalid fields |

---

## GET /api/v1/stores/:storeId/customers/:customerId

**Purpose:** Retrieve a single customer with address count and order summary.

**Authentication required:** Yes

**Permissions required:** `customers:view`

**Success Response — 200 OK:**
```json
{
  "data": {
    "id": "cus_01HXYZ555",
    "name": "Maria Silva",
    "phone": "+5511999998888",
    "email": "maria@email.com",
    "taxId": null,
    "notes": null,
    "status": "ACTIVE",
    "totalOrders": 14,
    "totalSpent": 74260,
    "firstOrderAt": "2025-02-01T18:30:00.000Z",
    "lastOrderAt": "2025-07-03T14:22:00.000Z",
    "addressCount": 2,
    "createdAt": "2025-02-01T18:30:00.000Z",
    "updatedAt": "2025-07-03T14:22:00.000Z"
  }
}
```

---

## PATCH /api/v1/stores/:storeId/customers/:customerId

**Purpose:** Update a customer's fields or block/unblock them.

**Authentication required:** Yes

**Permissions required:** `customers:edit` (for field updates); `customers:block` (for status changes)

**Request Body:** Any subset of: `name`, `phone`, `email`, `taxId`, `notes`, `status`

**Business Rules:**
- Changing status to BLOCKED requires `customers:block` permission.
- A BLOCKED customer cannot place new orders.
- `totalOrders` and `totalSpent` are read-only — computed by the system.

**Success Response — 200 OK:** Returns the updated customer.

---

## GET /api/v1/stores/:storeId/customers/:customerId/addresses

**Purpose:** List all saved delivery addresses for a customer.

**Authentication required:** Yes

**Permissions required:** `customers:view`

**Success Response — 200 OK:**
```json
{
  "data": [
    {
      "id": "adr_01HXYZ333",
      "customerId": "cus_01HXYZ555",
      "label": "HOME",
      "street": "Rua das Flores",
      "number": "123",
      "complement": "Apto 4B",
      "neighborhood": "Jardim América",
      "city": "São Paulo",
      "state": "SP",
      "postalCode": "01310-100",
      "country": "BR",
      "latitude": -23.561684,
      "longitude": -46.655981,
      "isDefault": true,
      "createdAt": "2025-02-01T18:30:00.000Z"
    }
  ]
}
```

---

## POST /api/v1/stores/:storeId/customers/:customerId/addresses

**Purpose:** Add a new delivery address for a customer.

**Authentication required:** Yes

**Permissions required:** `customers:edit`

**Request Body:**

| Field | Type | Required | Validation |
|---|---|---|---|
| `label` | string | No | `HOME`, `WORK`, `OTHER`. Default: `OTHER` |
| `street` | string | Yes | |
| `number` | string | Yes | |
| `complement` | string | No | |
| `neighborhood` | string | Yes | |
| `city` | string | Yes | |
| `state` | string | Yes | 2-character ISO code |
| `postalCode` | string | Yes | |
| `country` | string | No | Default: `BR` |
| `latitude` | number | No | |
| `longitude` | number | No | |
| `isDefault` | boolean | No | Default: `false`. Setting to `true` clears default on all other addresses |

**Request Example:**
```json
{
  "label": "HOME",
  "street": "Rua das Flores",
  "number": "123",
  "complement": "Apto 4B",
  "neighborhood": "Jardim América",
  "city": "São Paulo",
  "state": "SP",
  "postalCode": "01310-100",
  "isDefault": true
}
```

**Success Response — 201 Created:** Returns the created address.

---

## PATCH /api/v1/stores/:storeId/customers/:customerId/addresses/:addressId

**Purpose:** Update an existing address.

**Authentication required:** Yes

**Permissions required:** `customers:edit`

**Request Body:** Any subset of address fields.

**Business Rules:**
- Updating an address does not affect historical order snapshots. The snapshot is immutable once the order is created.

**Success Response — 200 OK:** Returns the updated address.

---

## DELETE /api/v1/stores/:storeId/customers/:customerId/addresses/:addressId

**Purpose:** Soft-delete a customer address.

**Authentication required:** Yes

**Permissions required:** `customers:edit`

**Delete behavior:** Soft delete. Historical order snapshots retain the address data permanently.

**Cascade behavior:** None.

**Success Response — 204 No Content**

---

## GET /api/v1/stores/:storeId/customers/:customerId/orders

**Purpose:** List all orders from a specific customer at this store.

**Authentication required:** Yes

**Permissions required:** `customers:view`

**Query Parameters:** `page`, `limit`, `status`, `sort`, `order`

**Success Response — 200 OK:** Same shape as `GET /orders`, filtered to this customer.

---

# Kitchen

## GET /api/v1/stores/:storeId/kitchen/tickets

**Purpose:** List kitchen tickets for the KDS display. Defaults to active tickets only (QUEUED and PREPARING).

**Authentication required:** Yes

**Permissions required:** `kitchen:view`

**Query Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `status` | string | `QUEUED,PREPARING` | Comma-separated statuses |
| `sort` | string | `queued_at` | `queued_at`, `order_number` |
| `order` | string | `asc` | `asc`, `desc` (oldest first for KDS) |

**Request Example:**
```
GET /api/v1/stores/str_01HXYZ789/kitchen/tickets?status=QUEUED,PREPARING&sort=queued_at&order=asc
```

**Success Response — 200 OK:**
```json
{
  "data": [
    {
      "id": "tkt_01HXYZ888",
      "storeId": "str_01HXYZ789",
      "orderId": "ord_01HXYZ001",
      "orderNumber": 4821,
      "orderType": "DELIVERY",
      "status": "PREPARING",
      "notes": "Sem cebola",
      "items": [
        {
          "id": "kit_01HXYZ777",
          "productName": "Pizza Margherita",
          "quantity": 1,
          "modifierSummary": ["Grande (35cm)"],
          "notes": "Bem assada",
          "status": "PREPARING"
        }
      ],
      "queuedAt": "2025-07-03T14:23:00.000Z",
      "startedAt": "2025-07-03T14:25:00.000Z",
      "readyAt": null,
      "cancelledAt": null,
      "minutesInQueue": 7
    }
  ]
}
```

---

## GET /api/v1/stores/:storeId/kitchen/tickets/:ticketId

**Purpose:** Retrieve a single kitchen ticket with all items.

**Authentication required:** Yes

**Permissions required:** `kitchen:view`

**Success Response — 200 OK:** Returns a single ticket object (same shape as list item above).

---

## POST /api/v1/stores/:storeId/kitchen/tickets/:ticketId/status

**Purpose:** Transition a kitchen ticket to the next status.

**Authentication required:** Yes

**Permissions required:** `kitchen:update_status`

**Request Body:**

| Field | Type | Required | Validation |
|---|---|---|---|
| `status` | string | Yes | Target status |

**Ownership note:** The Kitchen module is the sole owner of these two transitions. No other endpoint may set a Kitchen Ticket (or the parent Order) to `PREPARING`/`READY` — see the ownership note on `POST /orders/:orderId/status`.

**Allowed Transitions:**

| From | To | Side Effects |
|---|---|---|
| `QUEUED` | `PREPARING` | Records `started_at`; emits `kitchen_ticket.status_changed`. Orders service consumes this event and advances the order to `PREPARING`. |
| `PREPARING` | `READY` | Records `ready_at`; emits `kitchen_ticket.ready`. Delivery service consumes this event and creates a Delivery record (DELIVERY orders only). Orders service consumes the same event and advances the order to `READY`, then republishes `order.ready` for consumers that only need the Order-shaped view (see Event Contracts). |

**Forbidden Transitions:**

- `READY` → any (terminal state)
- `CANCELLED` → any (terminal state)
- `PREPARING` → `QUEUED` (no backward transitions)

**Request Example:**
```json
{
  "status": "READY"
}
```

**Success Response — 200 OK:** Returns the updated ticket.

**Error Responses:**

| Status | Code | When |
|---|---|---|
| 400 | `INVALID_TRANSITION` | Transition not allowed |
| 409 | `TICKET_CANCELLED` | Ticket has been cancelled (parent order was cancelled) |

**Events Produced:** `kitchen_ticket.status_changed`, `kitchen_ticket.ready` (when → READY)

---

## PATCH /api/v1/stores/:storeId/kitchen/items/:itemId/status

**Purpose:** Update the status of a single kitchen item within a ticket.

**Authentication required:** Yes

**Permissions required:** `kitchen:update_status`

**Request Body:**

| Field | Type | Required | Validation |
|---|---|---|---|
| `status` | string | Yes | `PREPARING`, `READY` |

**Request Example:**
```json
{
  "status": "READY"
}
```

**Success Response — 200 OK:** Returns the updated kitchen item.

**Business Rules:**
- Item-level status changes do not automatically change the parent ticket status. The ticket must be manually marked READY by the kitchen attendant.

---

# Delivery

## GET /api/v1/stores/:storeId/deliveries

**Purpose:** List deliveries for a store with filtering and pagination.

**Authentication required:** Yes

**Permissions required:** `delivery:view`

**Query Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `1` | |
| `limit` | integer | `20` | |
| `status` | string | — | Filter by status. Default shows all active: `AWAITING_PICKUP,DISPATCHED,IN_TRANSIT` |
| `dateFrom` | string | — | ISO date |
| `dateTo` | string | — | ISO date |

**Success Response — 200 OK:**
```json
{
  "data": [
    {
      "id": "dlv_01HXYZ600",
      "orderId": "ord_01HXYZ001",
      "orderNumber": 4821,
      "status": "AWAITING_PICKUP",
      "courierName": null,
      "courierPhone": null,
      "courierType": null,
      "platform": null,
      "deliveryAddress": {
        "street": "Rua das Flores",
        "number": "123",
        "neighborhood": "Jardim América",
        "city": "São Paulo",
        "state": "SP"
      },
      "estimatedMinutes": null,
      "createdAt": "2025-07-03T14:35:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 8, "totalPages": 1, "hasNextPage": false, "hasPreviousPage": false }
}
```

---

## GET /api/v1/stores/:storeId/deliveries/:deliveryId

**Purpose:** Retrieve a single delivery record.

**Authentication required:** Yes

**Permissions required:** `delivery:view`

**Success Response — 200 OK:** Returns the full delivery object including the complete address snapshot.

---

## PATCH /api/v1/stores/:storeId/deliveries/:deliveryId

**Purpose:** Assign or update a courier for a delivery.

**Authentication required:** Yes

**Permissions required:** `delivery:assign_courier`

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `courierName` | string | Yes | Courier's name |
| `courierPhone` | string | No | Courier's phone number |
| `courierType` | string | Yes | `INTERNAL` or `PLATFORM` |
| `platform` | string | Conditional | Required when courierType = PLATFORM: `IFOOD`, `RAPPI`, `UBER_EATS`, `LOGGI`, `OTHER` |
| `platformDeliveryId` | string | No | External platform reference ID |
| `estimatedMinutes` | integer | No | Estimated delivery time in minutes |

**Request Example:**
```json
{
  "courierName": "Pedro Alves",
  "courierPhone": "+5511988887777",
  "courierType": "INTERNAL",
  "estimatedMinutes": 30
}
```

**Success Response — 200 OK:** Returns the updated delivery.

**Business Rules:**
- A delivery can be updated at any active status (AWAITING_PICKUP, DISPATCHED, IN_TRANSIT).
- Reassigning a courier after dispatch requires `manager` or `owner` role.

---

## POST /api/v1/stores/:storeId/deliveries/:deliveryId/status

**Purpose:** Transition a delivery to the next status.

**Ownership note:** The Delivery module is the sole owner of these transitions. No other endpoint may set a Delivery (or the parent Order's `OUT_FOR_DELIVERY`/`DELIVERED` status) directly — see the ownership note on `POST /orders/:orderId/status`.

**Authentication required:** Yes

**Permissions required:** `delivery:update_status`

**Request Body:**

| Field | Type | Required | Validation |
|---|---|---|---|
| `status` | string | Yes | Target status |
| `reason` | string | Conditional | Required when transitioning to FAILED |

**Allowed Transitions:**

| From | To | Side Effects |
|---|---|---|
| `AWAITING_PICKUP` | `DISPATCHED` | Records `dispatched_at`; emits `delivery.dispatched`. Orders service consumes this event and advances the order to `OUT_FOR_DELIVERY`, then republishes `order.out_for_delivery` for consumers that only need the Order-shaped view (see Event Contracts). |
| `DISPATCHED` | `IN_TRANSIT` | Optional intermediate step |
| `IN_TRANSIT` | `DELIVERED` | Records `delivered_at`; emits `delivery.delivered`. Orders service consumes this event, advances the order to `DELIVERED`, and republishes `order.delivered` — which the Customers service consumes to update order stats. |
| `DISPATCHED` | `DELIVERED` | Skips IN_TRANSIT. Same side effects as above |
| `DISPATCHED` | `FAILED` | Records `failed_at` and `failed_reason`; requires manager authorization if already dispatched |
| `IN_TRANSIT` | `FAILED` | Same as above |
| `FAILED` | `RETURNED` | Marks the order as returned to store |

**Request Example:**
```json
{
  "status": "DISPATCHED"
}
```

**Success Response — 200 OK:** Returns the updated delivery.

**Events Produced:** `delivery.dispatched`, `delivery.delivered`, `delivery.failed`

---

# Payments

## GET /api/v1/stores/:storeId/payments

**Purpose:** List payments for a store with filtering and pagination.

**Authentication required:** Yes

**Permissions required:** `finance:view`

**Query Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `1` | |
| `limit` | integer | `20` | |
| `status` | string | — | `PAID`, `PENDING`, `FAILED`, `REFUNDED`, `PARTIALLY_REFUNDED` |
| `method` | string | — | `CASH`, `CREDIT_CARD`, `DEBIT_CARD`, `PIX`, `VOUCHER` |
| `dateFrom` | string | — | ISO date |
| `dateTo` | string | — | ISO date |
| `sort` | string | `paid_at` | `paid_at`, `amount`, `created_at` |
| `order` | string | `desc` | |

**Success Response — 200 OK:**
```json
{
  "data": [
    {
      "id": "pay_01HXYZ700",
      "orderId": "ord_01HXYZ001",
      "orderNumber": 4821,
      "storeId": "str_01HXYZ789",
      "amount": 5290,
      "refundedAmount": 0,
      "status": "PAID",
      "method": "PIX",
      "gateway": "MANUAL",
      "gatewayTransactionId": null,
      "paidAt": "2025-07-03T14:50:00.000Z",
      "refundedAt": null,
      "createdAt": "2025-07-03T14:49:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 47, "totalPages": 3, "hasNextPage": true, "hasPreviousPage": false }
}
```

---

## GET /api/v1/stores/:storeId/payments/:paymentId

**Purpose:** Retrieve a single payment with all payment attempts.

**Authentication required:** Yes

**Permissions required:** `finance:view`

**Success Response — 200 OK:**
```json
{
  "data": {
    "id": "pay_01HXYZ700",
    "orderId": "ord_01HXYZ001",
    "orderNumber": 4821,
    "amount": 5290,
    "refundedAmount": 0,
    "status": "PAID",
    "method": "PIX",
    "gateway": "MANUAL",
    "gatewayTransactionId": null,
    "refundedByUserId": null,
    "refundReason": null,
    "paidAt": "2025-07-03T14:50:00.000Z",
    "refundedAt": null,
    "attempts": [
      {
        "id": "att_01HXYZ800",
        "amount": 5290,
        "method": "PIX",
        "gateway": "MANUAL",
        "status": "CAPTURED",
        "gatewayTransactionId": null,
        "failureReason": null,
        "attemptedAt": "2025-07-03T14:49:00.000Z",
        "resolvedAt": "2025-07-03T14:50:00.000Z"
      }
    ],
    "createdAt": "2025-07-03T14:49:00.000Z",
    "updatedAt": "2025-07-03T14:50:00.000Z"
  }
}
```

---

## POST /api/v1/stores/:storeId/orders/:orderId/payment

**Purpose:** Initiate a payment for an order. Creates a Payment record and a PaymentAttempt.

**Authentication required:** Yes

**Permissions required:** `orders:edit`

**Request Body:**

| Field | Type | Required | Validation |
|---|---|---|---|
| `method` | string | Yes | Must be a method accepted in store settings |
| `gateway` | string | No | Default: `MANUAL` |
| `amount` | integer | No | Defaults to order `grand_total`. Validated to equal `grand_total` |

**Request Example:**
```json
{
  "method": "PIX",
  "gateway": "MANUAL"
}
```

**Success Response — 201 Created:**
```json
{
  "data": {
    "id": "pay_01HXYZ700",
    "orderId": "ord_01HXYZ001",
    "amount": 5290,
    "status": "PENDING",
    "method": "PIX",
    "gateway": "MANUAL",
    "attemptId": "att_01HXYZ800",
    "createdAt": "2025-07-03T14:49:00.000Z"
  }
}
```

**Error Responses:**

| Status | Code | When |
|---|---|---|
| 400 | `PAYMENT_METHOD_NOT_ACCEPTED` | The store does not accept this payment method |
| 400 | `ORDER_NOT_PAYABLE` | Order is in DRAFT, PENDING, or CANCELLED status |
| 409 | `PAYMENT_ALREADY_EXISTS` | A PAID payment already exists for this order |

**Business Rules:**
- An order can have only one PAID payment. Multiple payment attempts (failed ones) are tracked separately.
- `amount` must equal `order.grand_total`. A discrepancy produces a `PAYMENT_AMOUNT_MISMATCH` error.
- After calling this endpoint for MANUAL payments, call the confirm endpoint to mark as PAID.

**Events Produced:** `payment.created`

---

## POST /api/v1/stores/:storeId/payments/:paymentId/confirm

**Purpose:** Confirm a manual payment as received and mark it as PAID.

**Authentication required:** Yes

**Permissions required:** `orders:edit`

**Request Body:** None

**Success Response — 200 OK:** Returns the updated payment with status PAID.

**Events Produced:** `payment.paid`

---

## POST /api/v1/stores/:storeId/payments/:paymentId/refund

**Purpose:** Initiate a full or partial refund for a paid payment.

**Authentication required:** Yes

**Permissions required:** `orders:refund`

**Request Body:**

| Field | Type | Required | Validation |
|---|---|---|---|
| `amount` | integer | Yes | Cents. Must be ≤ `payment.amount − payment.refunded_amount` |
| `reason` | string | Yes | Min 10 characters |

**Request Example:**
```json
{
  "amount": 5290,
  "reason": "Cliente cancelou e já havia pago. Estorno integral aprovado."
}
```

**Success Response — 200 OK:**
```json
{
  "data": {
    "id": "pay_01HXYZ700",
    "amount": 5290,
    "refundedAmount": 5290,
    "status": "REFUNDED",
    "refundReason": "Cliente cancelou e já havia pago. Estorno integral aprovado.",
    "refundedAt": "2025-07-03T16:00:00.000Z"
  }
}
```

**Error Responses:**

| Status | Code | When |
|---|---|---|
| 400 | `REFUND_EXCEEDS_PAID_AMOUNT` | Refund amount > remaining refundable amount |
| 400 | `PAYMENT_NOT_REFUNDABLE` | Payment is not in PAID or PARTIALLY_REFUNDED status |
| 403 | `INSUFFICIENT_PERMISSIONS` | User does not have `orders:refund` (manager or owner only) |

**Business Rules:**
- Refunds require `orders:refund` permission — only managers and owners.
- `refund_reason` is mandatory (no silent refunds).
- A partial refund sets status to PARTIALLY_REFUNDED; full refund sets to REFUNDED.

**Events Produced:** `payment.refunded`

---

# Reports

## GET /api/v1/stores/:storeId/reports/overview

**Purpose:** High-level summary comparing a time period to the previous period. Used for the reports dashboard entry point.

**Authentication required:** Yes

**Permissions required:** `reports:view`

**Query Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `dateFrom` | string | Yes | ISO date start (store timezone) |
| `dateTo` | string | Yes | ISO date end (store timezone) |
| `compareWith` | string | No | `previous_period` (default), `previous_year` |

**Request Example:**
```
GET /api/v1/stores/str_01HXYZ789/reports/overview?dateFrom=2025-07-01&dateTo=2025-07-03&compareWith=previous_period
```

**Success Response — 200 OK:**
```json
{
  "data": {
    "period": { "from": "2025-07-01", "to": "2025-07-03" },
    "comparison": { "from": "2025-06-28", "to": "2025-06-30" },
    "metrics": {
      "totalRevenue": { "current": 2460500, "previous": 2290000, "changePercent": 7.4 },
      "totalOrders": { "current": 134, "previous": 121, "changePercent": 10.7 },
      "averageOrderValue": { "current": 18361, "previous": 18926, "changePercent": -3.0 },
      "newCustomers": { "current": 18, "previous": 12, "changePercent": 50.0 },
      "cancelledOrders": { "current": 4, "previous": 3, "changePercent": 33.3 },
      "avgPreparationMinutes": { "current": 17, "previous": 19, "changePercent": -10.5 }
    }
  }
}
```

---

## GET /api/v1/stores/:storeId/reports/sales

**Purpose:** Daily or hourly revenue breakdown for charting.

**Authentication required:** Yes

**Permissions required:** `reports:view`

**Query Parameters:** `dateFrom` (required), `dateTo` (required), `groupBy` (`day` or `hour`, default `day`)

**Success Response — 200 OK:**
```json
{
  "data": {
    "groupBy": "day",
    "series": [
      { "date": "2025-07-01", "revenue": 820500, "orderCount": 44, "averageOrderValue": 18648 },
      { "date": "2025-07-02", "revenue": 834000, "orderCount": 46, "averageOrderValue": 18130 },
      { "date": "2025-07-03", "revenue": 806000, "orderCount": 44, "averageOrderValue": 18318 }
    ],
    "totals": { "revenue": 2460500, "orderCount": 134 }
  }
}
```

---

## GET /api/v1/stores/:storeId/reports/orders

**Purpose:** Order analytics breakdown by type, channel, and status.

**Authentication required:** Yes

**Permissions required:** `reports:view`

**Query Parameters:** `dateFrom` (required), `dateTo` (required)

**Success Response — 200 OK:**
```json
{
  "data": {
    "byType": {
      "DELIVERY": { "count": 98, "revenue": 1823000 },
      "TAKEAWAY": { "count": 28, "revenue": 512000 },
      "DINE_IN": { "count": 8, "revenue": 125500 }
    },
    "byChannel": {
      "PHONE": { "count": 71, "revenue": 1310000 },
      "IN_STORE": { "count": 36, "revenue": 637500 },
      "MARKETPLACE": { "count": 27, "revenue": 513000 }
    },
    "cancellationRate": 2.98,
    "averagePreparationMinutes": 17,
    "averageDeliveryMinutes": 33
  }
}
```

---

## GET /api/v1/stores/:storeId/reports/products

**Purpose:** Product sales performance ranked by quantity and revenue.

**Authentication required:** Yes

**Permissions required:** `reports:view`

**Query Parameters:** `dateFrom` (required), `dateTo` (required), `page`, `limit`

**Success Response — 200 OK:**
```json
{
  "data": [
    {
      "productId": "prd_01HXYZ111",
      "productName": "Pizza Margherita",
      "categoryName": "Pizzas",
      "quantitySold": 89,
      "revenue": 470310,
      "refundedQuantity": 0,
      "revenueShare": 19.1
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 12, "totalPages": 1, "hasNextPage": false, "hasPreviousPage": false }
}
```

---

## GET /api/v1/stores/:storeId/reports/customers

**Purpose:** Customer analytics — new vs returning, top customers, retention metrics.

**Authentication required:** Yes

**Permissions required:** `reports:view`

**Query Parameters:** `dateFrom` (required), `dateTo` (required)

**Success Response — 200 OK:**
```json
{
  "data": {
    "totalActive": 342,
    "newInPeriod": 18,
    "returningInPeriod": 47,
    "repeatPurchaseRate": 72.3,
    "topCustomers": [
      {
        "customerId": "cus_01HXYZ555",
        "name": "Maria Silva",
        "orderCount": 5,
        "totalSpent": 26450
      }
    ]
  }
}
```

---

## GET /api/v1/stores/:storeId/reports/delivery

**Purpose:** Delivery performance metrics.

**Authentication required:** Yes

**Permissions required:** `reports:view`

**Query Parameters:** `dateFrom` (required), `dateTo` (required)

**Success Response — 200 OK:**
```json
{
  "data": {
    "totalDeliveries": 98,
    "delivered": 94,
    "failed": 3,
    "returned": 1,
    "successRate": 95.9,
    "averageDispatchMinutes": 8,
    "averageDeliveryMinutes": 33,
    "byPlatform": {
      "INTERNAL": { "count": 72, "successRate": 97.2 },
      "IFOOD": { "count": 26, "successRate": 92.3 }
    }
  }
}
```

> All report endpoints are strictly read-only. No report operation may modify operational data.

---

# Settings

## GET /api/v1/stores/:storeId

**Purpose:** Retrieve the store's profile — name, address, hours, and configuration.

**Authentication required:** Yes

**Permissions required:** `store:view`

**Success Response — 200 OK:**
```json
{
  "data": {
    "id": "str_01HXYZ789",
    "accountId": "acc_01HXYZ000",
    "name": "Pizza do João — Centro",
    "slug": "pizza-do-joao-centro",
    "type": "PIZZERIA",
    "status": "ACTIVE",
    "phone": "+551133334444",
    "email": "contato@pizzadojoao.com.br",
    "logoUrl": null,
    "timezone": "America/Sao_Paulo",
    "currency": "BRL",
    "minimumOrderValue": 3000,
    "deliveryFee": 500,
    "operatingHours": {
      "monday": { "isOpen": true, "slots": [{ "open": "18:00", "close": "23:30" }] },
      "tuesday": { "isOpen": true, "slots": [{ "open": "18:00", "close": "23:30" }] },
      "wednesday": { "isOpen": true, "slots": [{ "open": "18:00", "close": "23:30" }] },
      "thursday": { "isOpen": true, "slots": [{ "open": "18:00", "close": "23:30" }] },
      "friday": { "isOpen": true, "slots": [{ "open": "18:00", "close": "00:00" }] },
      "saturday": { "isOpen": true, "slots": [{ "open": "18:00", "close": "00:00" }] },
      "sunday": { "isOpen": false, "slots": [] }
    },
    "address": {
      "street": "Av. Paulista",
      "number": "1000",
      "complement": null,
      "neighborhood": "Bela Vista",
      "city": "São Paulo",
      "state": "SP",
      "postalCode": "01310-100",
      "country": "BR",
      "latitude": -23.561684,
      "longitude": -46.655981
    },
    "createdAt": "2025-01-15T09:00:00.000Z",
    "updatedAt": "2025-07-01T10:00:00.000Z"
  }
}
```

---

## PATCH /api/v1/stores/:storeId

**Purpose:** Update the store's profile fields.

**Authentication required:** Yes

**Permissions required:** `store:edit`

**Request Body:** Any subset of: `name`, `phone`, `email`, `logoUrl`, `timezone`, `currency`, `minimumOrderValue`, `deliveryFee`, `operatingHours`, `address`

**Request Example:**
```json
{
  "minimumOrderValue": 3500,
  "deliveryFee": 600,
  "operatingHours": {
    "monday": { "isOpen": false, "slots": [] },
    "tuesday": { "isOpen": true, "slots": [{ "open": "18:00", "close": "23:30" }] }
  }
}
```

**Success Response — 200 OK:** Returns the updated store object.

**Business Rules:**
- The `slug` field is immutable after creation and cannot be updated.
- Changing `currency` is blocked if the store has any orders (to prevent data inconsistency).

---

## GET /api/v1/stores/:storeId/settings

**Purpose:** Retrieve the store's operational settings.

**Authentication required:** Yes

**Permissions required:** `settings:view`

**Success Response — 200 OK:**
```json
{
  "data": {
    "storeId": "str_01HXYZ789",
    "autoConfirmOrders": false,
    "printReceiptOnConfirm": false,
    "receiptFormat": "THERMAL_80MM",
    "allowScheduledOrders": false,
    "maxScheduledDaysAhead": 7,
    "acceptsCash": true,
    "acceptsCard": true,
    "acceptsPix": true,
    "acceptsVoucher": false,
    "acceptsOnlinePayment": false,
    "notificationPreferences": {
      "newOrder": ["IN_APP"],
      "orderCancelled": ["IN_APP", "WHATSAPP"],
      "paymentFailed": ["IN_APP"]
    },
    "updatedAt": "2025-07-01T10:00:00.000Z"
  }
}
```

---

## PATCH /api/v1/stores/:storeId/settings

**Purpose:** Update the store's operational settings.

**Authentication required:** Yes

**Permissions required:** `settings:edit`

**Request Body:** Any subset of settings fields.

**Request Example:**
```json
{
  "autoConfirmOrders": true,
  "acceptsPix": true,
  "notificationPreferences": {
    "newOrder": ["IN_APP", "WHATSAPP"]
  }
}
```

**Success Response — 200 OK:** Returns the updated settings object.

**Business Rules:**
- Enabling `acceptsOnlinePayment` requires a payment gateway to be configured (future).

---

# Users (Team Management)

## GET /api/v1/stores/:storeId/team

**Purpose:** List all team members (memberships) for a store.

**Authentication required:** Yes

**Permissions required:** `users:view`

**Query Parameters:** `status` (filter), `search` (by name or email)

**Success Response — 200 OK:**
```json
{
  "data": [
    {
      "membershipId": "mbr_01HXYZ900",
      "userId": "usr_01HXYZ123456",
      "name": "João Silva",
      "email": "joao@marginflow.app",
      "avatarUrl": null,
      "membershipStatus": "ACTIVE",
      "role": {
        "id": "rol_01HXYZ000",
        "name": "OWNER",
        "displayName": "Proprietário"
      },
      "joinedAt": "2025-01-15T09:00:00.000Z",
      "lastLoginAt": "2025-07-03T10:00:00.000Z"
    },
    {
      "membershipId": "mbr_01HXYZ901",
      "userId": "usr_01HXYZ999",
      "name": "Carlos Mendes",
      "email": "carlos@restaurante.com",
      "avatarUrl": null,
      "membershipStatus": "INVITED",
      "role": {
        "id": "rol_01HXYZ001",
        "name": "CASHIER",
        "displayName": "Caixa"
      },
      "joinedAt": null,
      "lastLoginAt": null
    }
  ]
}
```

---

## POST /api/v1/stores/:storeId/team/invite

**Purpose:** Invite a user to join the store's team. Sends an invitation email.

**Authentication required:** Yes

**Permissions required:** `users:invite`

**Request Body:**

| Field | Type | Required | Validation |
|---|---|---|---|
| `email` | string | Yes | Valid email format |
| `name` | string | Yes | The name to pre-fill for new users |
| `roleId` | string | Yes | A role belonging to this store. Cannot assign OWNER role (future setting) |

**Request Example:**
```json
{
  "email": "carlos@restaurante.com",
  "name": "Carlos Mendes",
  "roleId": "rol_01HXYZ001"
}
```

**Success Response — 201 Created:**
```json
{
  "data": {
    "membershipId": "mbr_01HXYZ901",
    "email": "carlos@restaurante.com",
    "status": "INVITED",
    "invitedAt": "2025-07-03T15:00:00.000Z"
  }
}
```

**Error Responses:**

| Status | Code | When |
|---|---|---|
| 409 | `USER_ALREADY_MEMBER` | This email already has an active membership at this store |
| 400 | `ROLE_NOT_FOUND` | Role does not belong to this store |

**Business Rules:**
- If the email is already a registered user in the system, the invitation links to their existing account.
- If the email is new, a new User record is created with status INVITED.
- Invitation tokens expire after 72 hours. The inviter can resend via this same endpoint (if the membership is still INVITED).

**Events Produced:** `membership.invited`

---

## GET /api/v1/stores/:storeId/team/:userId

**Purpose:** Retrieve a team member's profile and membership details.

**Authentication required:** Yes

**Permissions required:** `users:view`

**Success Response — 200 OK:**
```json
{
  "data": {
    "membershipId": "mbr_01HXYZ900",
    "userId": "usr_01HXYZ123456",
    "name": "João Silva",
    "email": "joao@marginflow.app",
    "membershipStatus": "ACTIVE",
    "role": {
      "id": "rol_01HXYZ000",
      "name": "OWNER",
      "displayName": "Proprietário",
      "permissions": ["orders:create", "finance:view", "settings:edit"]
    },
    "invitedByUserId": null,
    "invitedAt": null,
    "acceptedAt": "2025-01-15T09:00:00.000Z"
  }
}
```

---

## PATCH /api/v1/stores/:storeId/team/:userId/role

**Purpose:** Change a team member's role at this store.

**Authentication required:** Yes

**Permissions required:** `users:edit`

**Request Body:**

| Field | Type | Required | Validation |
|---|---|---|---|
| `roleId` | string | Yes | A role belonging to this store |

**Request Example:**
```json
{
  "roleId": "rol_01HXYZ002"
}
```

**Success Response — 200 OK:** Returns the updated membership.

**Business Rules:**
- A user cannot change their own role.
- The OWNER role can only be reassigned by another OWNER.

---

## DELETE /api/v1/stores/:storeId/team/:userId

**Purpose:** Revoke a team member's access to this store.

**Authentication required:** Yes

**Permissions required:** `users:remove`

**Delete behavior:** Not a delete — sets the Membership status to REVOKED. The User record is untouched. The membership history is preserved.

**Success Response — 204 No Content**

**Error Responses:**

| Status | Code | When |
|---|---|---|
| 409 | `CANNOT_REMOVE_SELF` | A user cannot revoke their own membership |
| 409 | `CANNOT_REMOVE_LAST_OWNER` | The store must always have at least one active OWNER |

---

# Roles

## GET /api/v1/stores/:storeId/roles

**Purpose:** List all roles defined for a store.

**Authentication required:** Yes

**Permissions required:** `users:view`

**Success Response — 200 OK:**
```json
{
  "data": [
    {
      "id": "rol_01HXYZ000",
      "name": "OWNER",
      "displayName": "Proprietário",
      "permissions": ["orders:create", "orders:view", "finance:view", "settings:edit"],
      "isSystemRole": true,
      "memberCount": 1
    },
    {
      "id": "rol_01HXYZ001",
      "name": "CASHIER",
      "displayName": "Caixa",
      "permissions": ["orders:create", "orders:view", "customers:view"],
      "isSystemRole": true,
      "memberCount": 2
    }
  ]
}
```

---

# Authentication

## JWT Strategy

MarginFlow uses **RS256-signed JWTs** (asymmetric key pair). The private key signs tokens on the server; the public key validates them.

**Access Token:**
- Algorithm: RS256
- Expiration: **15 minutes**
- Delivered: Response body (never in cookies)
- Payload:
```json
{
  "sub": "usr_01HXYZ123456",
  "email": "joao@marginflow.app",
  "iat": 1751550000,
  "exp": 1751550900
}
```

**Refresh Token:**
- Expiration: **7 days**
- Delivered: HTTP-only, Secure, SameSite=Strict cookie named `mf_refresh_token`
- Storage: Hashed in the database. Never stored in plaintext.
- Rotation: Each refresh call issues a new refresh token and immediately invalidates the old one.

**Token Validation:**
Every authenticated request must include the access token in the `Authorization` header:
```
Authorization: Bearer {access_token}
```

Expired access tokens receive a `401 ACCESS_TOKEN_EXPIRED` response. The client must use the refresh token to obtain a new access token.

## Refresh Token Strategy

1. Client calls `POST /api/v1/auth/refresh` with the cookie automatically attached by the browser.
2. Server validates the refresh token hash against the database.
3. If valid: issues a new access token (body) and a new refresh token (cookie). The old refresh token is deleted from the database.
4. If invalid or expired: responds with `401 REFRESH_TOKEN_INVALID`. Client redirects to login.

**Security:** If a refresh token is used twice (replay attack), the server detects the reuse (because the old token was already rotated out), immediately invalidates the entire session, and forces a new login.

## Session Expiration

- Access tokens expire in 15 minutes. Clients silently refresh before expiry.
- Refresh tokens expire in 7 days.
- Logging out immediately invalidates the refresh token in the database.
- Administrators can force-expire all sessions for a user (future).

## Password Reset Flow

1. User submits email to `POST /api/v1/auth/forgot-password`.
2. If email exists: a unique, time-limited token (UUID) is hashed and stored. An email is sent with a link containing the raw token.
3. User clicks the link. Frontend calls `POST /api/v1/auth/reset-password` with the token and new password.
4. Server validates the raw token against the hash, checks expiry (60 minutes), sets the new password hash, invalidates all existing refresh tokens for the user.

## Invitation Flow

1. Existing team member calls `POST /api/v1/stores/:storeId/team/invite`.
2. A Membership record with status INVITED is created. An invitation token is hashed and stored.
3. An invitation email is sent with the raw token and a link.
4. Invited user clicks the link. If they have no account, they call `POST /api/v1/auth/accept-invitation` with token, name, and password.
5. Server validates the token, creates (or activates) the User, sets the Membership to ACTIVE, and issues a session.
6. Tokens expire after 72 hours. Re-inviting re-issues the token.

---

# Authorization

## Role-Based Access Control (RBAC)

MarginFlow uses **store-scoped, permission-based RBAC**. Every action is controlled by a specific Permission string. Roles are collections of Permissions, scoped to a specific Store.

**Built-in Roles and their default Permission sets:**

| Role | Purpose | Representative Permissions |
|---|---|---|
| `OWNER` | Full access to everything | All permissions |
| `MANAGER` | Operational management | All permissions except `billing:*` and `users:remove` |
| `CASHIER` | Order taking and payment | `orders:create`, `orders:view`, `orders:edit`, `orders:cancel`, `customers:view`, `customers:create` |
| `KITCHEN_ATTENDANT` | Kitchen display and production | `kitchen:view`, `kitchen:update_status`, `orders:view` |
| `DELIVERY_COORDINATOR` | Delivery assignment and tracking | `delivery:view`, `delivery:assign_courier`, `delivery:update_status`, `orders:view` |
| `ANALYST` | Reporting and analytics only | `reports:view`, `reports:export`, `finance:view`, `orders:view`, `products:view`, `customers:view` |

## Permission Naming

All permissions follow the pattern `domain:action`.

**Full Permission Catalog:**

```
orders:view         — Read order list and detail
orders:create       — Create new orders
orders:edit         — Modify orders (items, notes, status while editable)
orders:cancel       — Transition an order to CANCELLED
orders:refund       — Initiate payment refunds

kitchen:view        — Access kitchen display
kitchen:update_status — Transition ticket and item statuses

delivery:view       — Access delivery dashboard
delivery:assign_courier — Assign or update courier information
delivery:update_status — Transition delivery statuses

products:view       — Read catalog (products, categories, modifiers)
products:create     — Create catalog items
products:edit       — Modify catalog items
products:delete     — Soft-delete catalog items

menu:view           — Read menus
menu:create         — Create menus
menu:edit           — Edit menu sections and settings
menu:publish        — Activate or deactivate menus (status change)

customers:view      — Read customer list and profiles
customers:create    — Create customer records
customers:edit      — Edit customer fields and addresses
customers:block     — Change customer status to BLOCKED

crm:view            — Access CRM module
crm:manage_campaigns — Create and send campaigns (future)
crm:export          — Export customer data (future)

finance:view        — Access finance module and payment list
finance:export      — Export financial data

reports:view        — Access all report endpoints
reports:export      — Export report data (future)

settings:view       — Read store and operational settings
settings:edit       — Modify store and operational settings

users:view          — See team member list and profiles
users:invite        — Invite new team members
users:edit          — Change team member roles
users:remove        — Revoke team member access

store:view          — Read store profile
store:edit          — Modify store profile (name, address, hours)

billing:view        — View subscription and billing (future)
billing:manage      — Manage subscription (future)
```

## Store Isolation

Every API request to a store-scoped endpoint (`/stores/:storeId/...`) is validated as follows:

1. The JWT is verified. If invalid or expired → `401`.
2. The `storeId` from the URL path is looked up.
3. The service layer verifies that the authenticated user's ID has an **ACTIVE** Membership at the specified `storeId`. If not → `403 STORE_ACCESS_DENIED`.
4. The required Permission for the endpoint is checked against the user's Role permissions at that store. If missing → `403 INSUFFICIENT_PERMISSIONS`.
5. All database queries include `WHERE store_id = :storeId` to enforce data isolation at the query level. This is a mandatory application-layer invariant, not optional.

**A user with access to Store A cannot read, write, or infer data from Store B through any API call.**

---

# Error Standard

## Standard JSON Error Format

All error responses use the following envelope:

```json
{
  "error": {
    "code": "ORDER_NOT_FOUND",
    "message": "No order with this ID exists in this store.",
    "status": 404,
    "details": []
  }
}
```

| Field | Type | Description |
|---|---|---|
| `code` | string | Machine-readable error code in SCREAMING_SNAKE_CASE. Stable across releases. |
| `message` | string | Human-readable description. For development and logging. Do not display raw to end users. |
| `status` | integer | HTTP status code (mirrors the response status). |
| `details` | array | Empty for most errors. Populated for validation errors (see below). |

## HTTP Status Conventions

| Status | Meaning | When Used |
|---|---|---|
| `200 OK` | Success | Successful GET, PATCH, POST (non-creating) |
| `201 Created` | Resource created | Successful POST that creates a resource |
| `204 No Content` | Success, no body | Successful DELETE |
| `400 Bad Request` | Invalid business operation | Valid format but violated business rule (e.g., invalid status transition, product not available) |
| `401 Unauthorized` | Not authenticated | Missing or invalid access token |
| `403 Forbidden` | Not authorized | Authenticated but lacking store access or permission |
| `404 Not Found` | Resource missing | Entity does not exist in this store |
| `409 Conflict` | State conflict | Operation cannot be completed in the current state (e.g., duplicate name, cannot remove last owner) |
| `422 Unprocessable Entity` | Validation failure | Request body fails format validation |
| `429 Too Many Requests` | Rate limited | Request rate exceeded |
| `500 Internal Server Error` | Server error | Unexpected failure. Never leaks stack traces. |

## Validation Error Format

When a request body fails validation, the response is `422` with the `details` array populated:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed. Check the details array for field-level errors.",
    "status": 422,
    "details": [
      {
        "field": "items",
        "message": "Must contain at least 1 item."
      },
      {
        "field": "items[0].quantity",
        "message": "Must be a positive integer."
      },
      {
        "field": "items[0].selectedModifiers[0].modifierId",
        "message": "This modifier does not belong to the specified modifier group."
      }
    ]
  }
}
```

Each entry in `details` has:
- `field`: dot-notation path to the invalid field
- `message`: a clear, actionable description of the violation

## Common Error Codes

| Code | Status | Description |
|---|---|---|
| `VALIDATION_ERROR` | 422 | One or more request body fields failed validation |
| `INVALID_CREDENTIALS` | 401 | Email or password is incorrect |
| `ACCESS_TOKEN_EXPIRED` | 401 | JWT has expired. Refresh required |
| `ACCESS_TOKEN_INVALID` | 401 | JWT signature is invalid |
| `REFRESH_TOKEN_EXPIRED` | 401 | Refresh token has expired. Re-login required |
| `STORE_ACCESS_DENIED` | 403 | User has no membership at this store |
| `INSUFFICIENT_PERMISSIONS` | 403 | User lacks the required permission for this action |
| `STORE_NOT_FOUND` | 404 | Store ID does not exist |
| `ORDER_NOT_FOUND` | 404 | Order does not exist in this store |
| `PRODUCT_NOT_FOUND` | 404 | Product does not exist in this store |
| `CUSTOMER_NOT_FOUND` | 404 | Customer does not exist in this store |
| `INVALID_TRANSITION` | 400 | Requested status transition is not allowed |
| `ORDER_NOT_EDITABLE` | 409 | Order is beyond PENDING and cannot be modified |
| `CANCELLATION_REASON_REQUIRED` | 400 | Cancelling requires a reason |
| `PRODUCT_NOT_AVAILABLE` | 400 | Product is inactive or out of stock |
| `PAYMENT_AMOUNT_MISMATCH` | 400 | Payment amount does not equal order grand_total |
| `PAYMENT_ALREADY_EXISTS` | 409 | A PAID payment already exists for this order |
| `REFUND_EXCEEDS_PAID_AMOUNT` | 400 | Refund exceeds the remaining refundable amount |
| `CATEGORY_HAS_ACTIVE_PRODUCTS` | 409 | Cannot delete category with active products |
| `PHONE_ALREADY_REGISTERED` | 409 | Phone already used by another customer at this store |
| `USER_ALREADY_MEMBER` | 409 | User already has an active membership at this store |
| `CANNOT_REMOVE_LAST_OWNER` | 409 | Store must always have at least one active owner |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests in a short window |

---

# Versioning

## API Version Strategy

The API version is embedded in the URL path: `/api/v1/...`

URL versioning is used because:
- It is explicit and obvious in browser network tabs, logs, and documentation.
- It allows multiple versions to be deployed simultaneously during transitions.
- It is compatible with all HTTP clients without special header configuration.

**Version lifecycle:**

| Version | Status | Description |
|---|---|---|
| `v1` | **Current** | Active version. All new features are added here. |
| `v2` | Not yet released | Will be introduced when breaking changes are required |

## What Constitutes a Breaking Change

A new API version is released only for **breaking changes**:

- Removing or renaming an endpoint.
- Removing or renaming a field in a response body.
- Changing the type of a field.
- Changing the semantics of a field (e.g., changing a boolean to an enum).
- Changing a successful status code (e.g., from `200` to `201`).

**Non-breaking changes** (added to the current version without a new version):

- Adding new optional request fields.
- Adding new response fields.
- Adding new endpoint routes.
- Adding new valid values to an enum field.

## Deprecation Policy

1. When a field or endpoint is deprecated, it is marked with a `Deprecated` note in this document.
2. All deprecated endpoints return the HTTP header `Deprecation: true` and `Sunset: {date}` indicating when the endpoint will be removed.
3. A minimum **90-day notice** is given before removing any deprecated endpoint.
4. Operators are notified via email and in-app announcements.

---

# Event Contracts

MarginFlow uses a **domain event** model. Every significant state change produces a named event. Other modules subscribe to events they care about — they never call each other's internal code.

Events are delivered as JSON messages. In the current phase, events are processed in-process (synchronous event bus). In future phases, they will be published to a message broker (e.g., BullMQ, Redis Streams) for async processing and retries.

## Event Envelope

Every event shares the same envelope structure:

```json
{
  "eventId": "evt_01HXYZ999",
  "eventType": "order.confirmed",
  "occurredAt": "2025-07-03T14:23:00.000Z",
  "storeId": "str_01HXYZ789",
  "triggeredByUserId": "usr_01HXYZ123456",
  "payload": { }
}
```

| Field | Description |
|---|---|
| `eventId` | Unique event identifier. Used for idempotency — consumers must never process the same eventId twice |
| `eventType` | Dot-notation event name |
| `occurredAt` | UTC timestamp of the event |
| `storeId` | The store context. All events are store-scoped |
| `triggeredByUserId` | The user who caused the event. Null for system-triggered events |
| `payload` | Event-specific data. Schema described per event below |

## Raw Events vs. Derived Order Events

Each status-owning module (Kitchen, Delivery) publishes exactly one **raw event** per transition it owns: `kitchen_ticket.ready`, `delivery.dispatched`, `delivery.delivered`. These are the only events Delivery and Kitchen ever produce for their own transitions, and they are the events other modules that need the underlying detail (e.g., Delivery needs the address snapshot to create its record) must consume directly.

The Orders service consumes each raw event, advances its own `orders.status` projection, and then republishes a corresponding **derived event** — `order.ready`, `order.out_for_delivery`, `order.delivered` — purely for consumers that only care about the Order-shaped view and should never need to know Kitchen or Delivery exist (Customers, CRM, Reports, Analytics, Finance). A derived event's producer is always "Orders service," never the module whose raw event triggered it.

**Rule:** no module may consume both a raw event and its derived echo for the same transition — pick the one appropriate to what the consumer actually needs. Delivery consumes `kitchen_ticket.ready` (raw), never `order.ready` (derived). Nothing today consumes `order.out_for_delivery`; it exists for future Analytics/Notifications consumers.

**Synchronous-bus caveat:** because the current event bus is in-process and synchronous, a consumer is still able to block the original caller's request — this is what lets Delivery's manager-approval check on `order.cancelled` (see that event below) fail the request synchronously today. If the bus is ever replaced with an asynchronous broker (BullMQ, Redis Streams — see the note at the top of this section), any check that must block the *caller's* response can no longer live inside an async event consumer and must become a synchronous pre-check made directly by the producing service before it commits.

---

## order.created

**Producer:** Orders service, on `POST /orders`

**Consumers:** None (current phase). Future: Analytics

**Delivery guarantee:** At-least-once. Consumers must be idempotent on `eventId`.

**Payload:**
```json
{
  "orderId": "ord_01HXYZ001",
  "orderNumber": 4821,
  "type": "DELIVERY",
  "channel": "PHONE",
  "customerId": "cus_01HXYZ555",
  "grandTotal": 5290,
  "itemCount": 1
}
```

---

## order.confirmed

**Producer:** Orders service, on status transition → CONFIRMED

**Consumers:**
- **Kitchen service** — creates a KitchenTicket atomically with this event

**Delivery guarantee:** Exactly-once within the confirmation transaction. The Kitchen Ticket creation is part of the same database transaction as the status change.

**Payload:**
```json
{
  "orderId": "ord_01HXYZ001",
  "orderNumber": 4821,
  "type": "DELIVERY",
  "items": [
    {
      "orderItemId": "itm_01HXYZ777",
      "productName": "Pizza Margherita",
      "quantity": 1,
      "modifierSummary": ["Grande (35cm)"],
      "notes": "Bem assada"
    }
  ],
  "orderNotes": "Sem cebola",
  "confirmedAt": "2025-07-03T14:23:00.000Z"
}
```

---

## order.ready

**Producer:** Orders service — a **derived event**, republished after consuming `kitchen_ticket.ready` and advancing the order's own status to READY. Never produced directly by Kitchen.

**Consumers:** None in the current phase. Future: Analytics, Notifications. (Delivery does **not** consume this — it consumes the raw `kitchen_ticket.ready` event directly, since that is the event carrying the address snapshot it needs.)

**Payload:**
```json
{
  "orderId": "ord_01HXYZ001",
  "orderNumber": 4821,
  "type": "DELIVERY",
  "readyAt": "2025-07-03T14:41:00.000Z"
}
```

---

## order.out_for_delivery

**Producer:** Orders service — a **derived event**, republished after consuming `delivery.dispatched` and advancing the order's own status to OUT_FOR_DELIVERY. Never produced directly by Delivery.

**Consumers:** None in the current phase. Future: Analytics, Notifications.

**Payload:**
```json
{
  "orderId": "ord_01HXYZ001",
  "orderNumber": 4821,
  "deliveryId": "dlv_01HXYZ600"
}
```

---

## order.delivered

**Producer:** Orders service. Two distinct paths converge on this event: (1) for DELIVERY orders, it is a **derived event** republished after consuming `delivery.delivered`; (2) for TAKEAWAY orders, which have no Delivery record, it is produced directly by the Orders service on the `READY → DELIVERED` transition of `POST /orders/:orderId/status`.

**Consumers:**
- **Customers service** — increments `total_orders`, updates `last_order_at` (does NOT update `total_spent` — that waits for payment.paid)
- **CRM service** — marks order as eligible for segmentation and campaigns
- **Analytics service** (future) — records conversion event

**Payload:**
```json
{
  "orderId": "ord_01HXYZ001",
  "orderNumber": 4821,
  "customerId": "cus_01HXYZ555",
  "grandTotal": 5290,
  "type": "DELIVERY",
  "deliveredAt": "2025-07-03T15:05:00.000Z"
}
```

---

## order.cancelled

**Producer:** Orders service, on status transition → CANCELLED. This is an Orders-owned transition, not a derived event — the client calls `POST /orders/:orderId/status` directly.

**Consumers:**
- **Kitchen service** — transitions KitchenTicket to CANCELLED
- **Delivery service** — transitions Delivery to FAILED. If the Delivery had already reached DISPATCHED or later, this consumer enforces the manager-authorization requirement (see `POST /orders/:orderId/status`); on the current synchronous in-process bus, a failed check here still rejects the original request. This is the one place in the system where an event consumer performs a synchronous authorization check — see the Raw Events vs. Derived Order Events note above for what changes if the bus becomes asynchronous.
- **Finance service** (future) — records cancellation

**Payload:**
```json
{
  "orderId": "ord_01HXYZ001",
  "orderNumber": 4821,
  "previousStatus": "PREPARING",
  "cancelledReason": "Cliente desistiu da compra",
  "cancelledByUserId": "usr_01HXYZ123456",
  "cancelledAt": "2025-07-03T14:35:00.000Z"
}
```

---

## kitchen_ticket.created

**Producer:** Kitchen service, triggered by consuming `order.confirmed`

**Consumers:** None (the KDS connects via WebSocket, not via events)

**Payload:**
```json
{
  "ticketId": "tkt_01HXYZ888",
  "orderId": "ord_01HXYZ001",
  "orderNumber": 4821,
  "orderType": "DELIVERY",
  "queuedAt": "2025-07-03T14:23:00.000Z"
}
```

---

## kitchen_ticket.status_changed

**Producer:** Kitchen service, on every ticket status transition

**Consumers:** Orders service (syncs order status for PREPARING transitions)

**Payload:**
```json
{
  "ticketId": "tkt_01HXYZ888",
  "orderId": "ord_01HXYZ001",
  "previousStatus": "QUEUED",
  "newStatus": "PREPARING",
  "occurredAt": "2025-07-03T14:25:00.000Z"
}
```

---

## kitchen_ticket.ready

**Producer:** Kitchen service, on ticket status → READY. This is the **raw event** for the Ready transition — the only one Kitchen ever produces for it.

**Consumers:**
- **Delivery service** — creates the Delivery record (for DELIVERY orders only), using `deliveryAddressSnapshot` from this payload
- **Orders service** — transitions order to READY, then republishes the derived `order.ready` event

**Payload:**
```json
{
  "ticketId": "tkt_01HXYZ888",
  "orderId": "ord_01HXYZ001",
  "orderNumber": 4821,
  "orderType": "DELIVERY",
  "readyAt": "2025-07-03T14:41:00.000Z",
  "deliveryAddressSnapshot": {
    "street": "Rua das Flores",
    "number": "123",
    "neighborhood": "Jardim América",
    "city": "São Paulo",
    "state": "SP",
    "postalCode": "01310-100",
    "latitude": -23.561684,
    "longitude": -46.655981
  }
}
```

`deliveryAddressSnapshot` is present only when `orderType = DELIVERY`; it is the data Delivery needs to create its record and is never carried by the derived `order.ready` event.

---

## delivery.created

**Producer:** Delivery service, triggered by consuming `kitchen_ticket.ready` for DELIVERY orders

**Consumers:** None (the delivery dashboard connects via WebSocket)

**Payload:**
```json
{
  "deliveryId": "dlv_01HXYZ600",
  "orderId": "ord_01HXYZ001",
  "orderNumber": 4821,
  "deliveryAddress": { "neighborhood": "Jardim América", "city": "São Paulo" },
  "createdAt": "2025-07-03T14:41:00.000Z"
}
```

---

## delivery.dispatched

**Producer:** Delivery service, on delivery status → DISPATCHED. This is the **raw event** for the dispatch transition — the only one Delivery ever produces for it.

**Consumers:** Orders service — advances order status to OUT_FOR_DELIVERY, then republishes the derived `order.out_for_delivery` event

**Payload:**
```json
{
  "deliveryId": "dlv_01HXYZ600",
  "orderId": "ord_01HXYZ001",
  "courierName": "Pedro Alves",
  "courierType": "INTERNAL",
  "platform": null,
  "dispatchedAt": "2025-07-03T14:47:00.000Z"
}
```

---

## delivery.delivered

**Producer:** Delivery service, on delivery status → DELIVERED. This is the **raw event** for the delivered transition — the only one Delivery ever produces for it.

**Consumers:** Orders service — transitions order status → DELIVERED, then republishes the derived `order.delivered` event, which Customers/CRM/Analytics consume

**Payload:**
```json
{
  "deliveryId": "dlv_01HXYZ600",
  "orderId": "ord_01HXYZ001",
  "deliveredAt": "2025-07-03T15:05:00.000Z"
}
```

---

## delivery.failed

**Producer:** Delivery service, on delivery status → FAILED

**Consumers:** Orders service — flags order for manual resolution

**Payload:**
```json
{
  "deliveryId": "dlv_01HXYZ600",
  "orderId": "ord_01HXYZ001",
  "failedReason": "Endereço não encontrado",
  "failedAt": "2025-07-03T15:10:00.000Z"
}
```

---

## payment.created

**Producer:** Payments service, on `POST /orders/:orderId/payment`

**Consumers:** None (current phase)

**Payload:**
```json
{
  "paymentId": "pay_01HXYZ700",
  "orderId": "ord_01HXYZ001",
  "amount": 5290,
  "method": "PIX",
  "gateway": "MANUAL"
}
```

---

## payment.paid

**Producer:** Payments service, when payment reaches PAID status

**Consumers:**
- **Finance service** — records revenue transaction
- **Customers service** — increments `total_spent` on the customer record
- **Invoice service** (future) — triggers fiscal document generation
- **Loyalty service** (future) — awards points

**Payload:**
```json
{
  "paymentId": "pay_01HXYZ700",
  "orderId": "ord_01HXYZ001",
  "customerId": "cus_01HXYZ555",
  "amount": 5290,
  "method": "PIX",
  "gateway": "MANUAL",
  "paidAt": "2025-07-03T14:50:00.000Z"
}
```

---

## payment.refunded

**Producer:** Payments service, on refund processing

**Consumers:**
- **Finance service** — records reversal transaction
- **Loyalty service** (future) — reverses points

**Payload:**
```json
{
  "paymentId": "pay_01HXYZ700",
  "orderId": "ord_01HXYZ001",
  "refundedAmount": 5290,
  "isFullRefund": true,
  "reason": "Cliente cancelou e já havia pago.",
  "refundedByUserId": "usr_01HXYZ123456",
  "refundedAt": "2025-07-03T16:00:00.000Z"
}
```

---

## membership.invited

**Producer:** Team management service, on `POST /team/invite`

**Consumers:** Notification service — sends invitation email

**Payload:**
```json
{
  "membershipId": "mbr_01HXYZ901",
  "storeId": "str_01HXYZ789",
  "storeName": "Pizza do João — Centro",
  "invitedEmail": "carlos@restaurante.com",
  "invitedName": "Carlos Mendes",
  "roleName": "CASHIER",
  "invitedByUserId": "usr_01HXYZ123456",
  "invitationToken": "raw_token_for_email_link",
  "expiresAt": "2025-07-06T15:00:00.000Z"
}
```

> Note: `invitationToken` is present only in this event payload (consumed by the notification service) and is never returned in API responses.

---

## membership.accepted

**Producer:** Auth service, on `POST /auth/accept-invitation`

**Consumers:** Notification service — sends welcome email; Analytics (future)

**Payload:**
```json
{
  "membershipId": "mbr_01HXYZ901",
  "userId": "usr_01HXYZ999",
  "storeId": "str_01HXYZ789",
  "roleName": "CASHIER",
  "acceptedAt": "2025-07-04T09:00:00.000Z"
}
```

---

## menu.published

**Producer:** Products service, on `POST /menus/:menuId/publish`

**Consumers:** None in the current phase. Future: ordering channels invalidating a cached menu view.

**Payload:**
```json
{
  "menuId": "mnu_01HXYZ200",
  "storeId": "str_01HXYZ789",
  "channel": "DELIVERY",
  "publishedAt": "2025-07-03T15:00:00.000Z"
}
```

---

## menu.unpublished

**Producer:** Products service, on `POST /menus/:menuId/unpublish`

**Consumers:** None in the current phase. Future: ordering channels invalidating a cached menu view.

**Payload:**
```json
{
  "menuId": "mnu_01HXYZ200",
  "storeId": "str_01HXYZ789",
  "channel": "DELIVERY",
  "unpublishedAt": "2025-07-03T18:00:00.000Z"
}
```

---

## Event Consumption Summary

| Event | Producers | Consumers |
|---|---|---|
| `order.created` | Orders | (Analytics — future) |
| `order.confirmed` | Orders | Kitchen (creates ticket) |
| `order.ready` *(derived)* | Orders (after consuming `kitchen_ticket.ready`) | (Analytics/Notifications — future) |
| `order.out_for_delivery` *(derived)* | Orders (after consuming `delivery.dispatched`) | (Analytics/Notifications — future) |
| `order.delivered` | Orders (derived from `delivery.delivered` for DELIVERY orders; produced directly for TAKEAWAY pickup) | Customers (stats), CRM, Analytics |
| `order.cancelled` | Orders | Kitchen (cancels ticket), Delivery (cancels record; enforces manager approval if dispatched), Finance |
| `kitchen_ticket.created` | Kitchen | — |
| `kitchen_ticket.status_changed` | Kitchen | Orders (syncs status to PREPARING) |
| `kitchen_ticket.ready` *(raw)* | Kitchen | Delivery (creates record), Orders (updates status to READY, republishes `order.ready`) |
| `delivery.created` | Delivery (after consuming `kitchen_ticket.ready`) | — |
| `delivery.dispatched` *(raw)* | Delivery | Orders (updates status to OUT_FOR_DELIVERY, republishes `order.out_for_delivery`) |
| `delivery.delivered` *(raw)* | Delivery | Orders (updates status to DELIVERED, republishes `order.delivered`) |
| `delivery.failed` | Delivery | Orders (flag for resolution) |
| `payment.created` | Payments | — |
| `payment.paid` | Payments | Finance, Customers (total_spent), Invoice, Loyalty |
| `payment.refunded` | Payments | Finance, Loyalty |
| `membership.invited` | Team | Notifications |
| `membership.accepted` | Auth | Notifications |
| `menu.published` | Products | (future) |
| `menu.unpublished` | Products | (future) |

*(raw)* = the single event a status-owning module produces for its own transition. *(derived)* = an Order-shaped echo the Orders service republishes after consuming a raw event, for consumers that should not depend on Kitchen/Delivery internals. See "Raw Events vs. Derived Order Events" above.
| `membership.accepted` | Auth | Notifications, Analytics |
