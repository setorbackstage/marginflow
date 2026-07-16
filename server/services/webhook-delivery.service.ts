import "server-only"
import { createHmac } from "crypto"
import { eventBus } from "@/server/lib"
import { webhookEndpointRepository } from "@/server/repositories"
import { prisma } from "@/server/db"
import type { DbClient } from "@/server/db"
import { logger } from "@/server/lib/logger"
import { generateRawToken } from "@/server/lib/auth"
import { ConflictError, NotFoundError, ForbiddenError } from "@/server/lib/errors"
import type { WebhookEndpoint } from "@/generated/prisma/client"
import type { DomainEventType } from "@/server/lib"

// ---------------------------------------------------------------------------
// HMAC-SHA256 signing
// ---------------------------------------------------------------------------

function signPayload(secret: string, body: string): string {
  return "sha256=" + createHmac("sha256", secret).update(body).digest("hex")
}

// ---------------------------------------------------------------------------
// HTTP delivery — fire-and-forget, single attempt per delivery.
// ---------------------------------------------------------------------------

const DELIVERY_TIMEOUT_MS = 10_000

async function deliverToEndpoint(endpoint: WebhookEndpoint, eventType: string, payload: unknown): Promise<void> {
  const body = JSON.stringify({ event: eventType, timestamp: new Date().toISOString(), payload })
  const signature = signPayload(endpoint.secret, body)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS)

  try {
    const res = await fetch(endpoint.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-MarginFlow-Signature": signature,
        "X-MarginFlow-Event": eventType,
        "User-Agent": "MarginFlow-Webhooks/1.0",
      },
      body,
      signal: controller.signal,
    })
    if (!res.ok) {
      logger.warn("webhook-delivery.http_error", {
        endpointId: endpoint.id,
        url: endpoint.url,
        event: eventType,
        status: res.status,
      })
    } else {
      logger.info("webhook-delivery.ok", { endpointId: endpoint.id, event: eventType, status: res.status })
    }
  } catch (err) {
    logger.warn("webhook-delivery.network_error", {
      endpointId: endpoint.id,
      url: endpoint.url,
      event: eventType,
      error: err instanceof Error ? err.message : String(err),
    })
  } finally {
    clearTimeout(timer)
  }
}

// ---------------------------------------------------------------------------
// Fan-out — finds active endpoints for the event, delivers in parallel.
// Uses the top-level `prisma` client (not the transaction db) because webhook
// delivery is intentionally fire-and-forget after the transaction commits.
// ---------------------------------------------------------------------------

async function fanOut(storeId: string, eventType: string, payload: unknown): Promise<void> {
  const endpoints = await webhookEndpointRepository.findActiveForEvent(prisma, storeId, eventType)
  if (endpoints.length === 0) return
  await Promise.allSettled(endpoints.map((ep) => deliverToEndpoint(ep, eventType, payload)))
}

// ---------------------------------------------------------------------------
// Supported outbound events
// ---------------------------------------------------------------------------

export const SUPPORTED_EVENTS: DomainEventType[] = [
  "order.created",
  "order.confirmed",
  "order.cancelled",
  "payment.paid",
  "payment.refunded",
  "delivery.dispatched",
  "delivery.delivered",
]

// ---------------------------------------------------------------------------
// Register event bus listeners — one per supported event type.
// Each listener fans out to all active endpoints registered for that event.
// ---------------------------------------------------------------------------

for (const eventType of SUPPORTED_EVENTS) {
  eventBus.on(eventType, `webhook-delivery:${eventType}`, async (event) => {
    try {
      // Fan-out is async/network — do not block the event bus or transaction.
      void fanOut(event.storeId, eventType, event.payload)
    } catch (err) {
      logger.warn(`webhook-delivery.fanout.${eventType}`, { error: String(err) })
    }
  })
}

// ---------------------------------------------------------------------------
// CRUD — used by API routes
// ---------------------------------------------------------------------------

function toSafeEndpoint(ep: WebhookEndpoint) {
  return {
    id: ep.id,
    storeId: ep.storeId,
    url: ep.url,
    events: ep.events.length === 0 ? ["*"] : ep.events,
    isActive: ep.isActive,
    createdAt: ep.createdAt,
    updatedAt: ep.updatedAt,
    // secret is intentionally omitted — only returned on creation.
  }
}

export const webhookDeliveryService = {
  async list(db: DbClient, storeId: string) {
    const endpoints = await webhookEndpointRepository.findByStore(db, storeId)
    return endpoints.map(toSafeEndpoint)
  },

  async create(db: DbClient, storeId: string, url: string, events: string[]) {
    const invalid = events.filter((e) => e !== "*" && !(SUPPORTED_EVENTS as string[]).includes(e))
    if (invalid.length > 0) {
      throw new ConflictError("INVALID_EVENTS", `Eventos não suportados: ${invalid.join(", ")}`)
    }

    const secret = generateRawToken()
    const endpoint = await webhookEndpointRepository.create(db, {
      store: { connect: { id: storeId } },
      url,
      secret,
      events: events.includes("*") ? [] : events,
    })

    // Return secret once — caller must store it; not recoverable later.
    return { ...toSafeEndpoint(endpoint), secret }
  },

  async update(db: DbClient, id: string, storeId: string, patch: { url?: string; events?: string[]; isActive?: boolean }) {
    const existing = await webhookEndpointRepository.findById(db, id)
    if (!existing) throw new NotFoundError("WEBHOOK_NOT_FOUND", "Webhook não encontrado.")
    if (existing.storeId !== storeId) throw new ForbiddenError("FORBIDDEN", "Acesso negado.")

    if (patch.events) {
      const invalid = patch.events.filter((e) => e !== "*" && !(SUPPORTED_EVENTS as string[]).includes(e))
      if (invalid.length > 0) {
        throw new ConflictError("INVALID_EVENTS", `Eventos não suportados: ${invalid.join(", ")}`)
      }
    }

    const updated = await webhookEndpointRepository.update(db, id, {
      ...(patch.url !== undefined ? { url: patch.url } : {}),
      ...(patch.events !== undefined ? { events: patch.events.includes("*") ? [] : patch.events } : {}),
      ...(patch.isActive !== undefined ? { isActive: patch.isActive } : {}),
    })
    return toSafeEndpoint(updated)
  },

  async delete(db: DbClient, id: string, storeId: string) {
    const existing = await webhookEndpointRepository.findById(db, id)
    if (!existing) throw new NotFoundError("WEBHOOK_NOT_FOUND", "Webhook não encontrado.")
    if (existing.storeId !== storeId) throw new ForbiddenError("FORBIDDEN", "Acesso negado.")
    await webhookEndpointRepository.delete(db, id)
  },
}
