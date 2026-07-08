import "server-only"
import type { DbClient } from "../../db"
import { logger } from "../logger"
import type { DomainEvent, DomainEventOf, DomainEventType } from "./types"

type Listener<Type extends DomainEventType> = (event: DomainEventOf<Type>, db: DbClient) => Promise<void>

/**
 * In-process, synchronous domain event bus — API_SPEC.md's Event Contracts
 * section: "In the current phase, events are processed in-process
 * (synchronous event bus)." `publish` awaits every listener in registration
 * order and passes through the same `db` (often a `$transaction` client),
 * so a listener's writes land in the same transaction as the publisher's —
 * required for guarantees like "Kitchen Ticket creation is part of the same
 * database transaction as the [order.confirmed] status change."
 *
 * A listener that throws aborts `publish` (and, if `db` is a transaction
 * client, the whole transaction) — this is the mechanism behind Business
 * Rule 22 (dispatched deliveries require manager approval to cancel): see
 * the "Synchronous-bus caveat" note in API_SPEC.md's Event Contracts.
 *
 * `on` requires a `key` unique per call site (e.g. "kitchen.service:order.confirmed")
 * and registering the same key again *replaces* the previous listener instead of
 * appending. Each service module calls `eventBus.on(...)` at module scope, and this
 * `eventBus` instance is stashed on `globalThis` to survive Next.js dev-mode module
 * reloads (see below) — without keyed replacement, every reload of a service module
 * would re-run its top-level `eventBus.on(...)` call and stack a duplicate listener
 * onto the same long-lived bus, so a single event would fire that listener's side
 * effects (e.g. Kitchen Ticket creation) multiple times per publish.
 */
class EventBus {
  private readonly listeners = new Map<DomainEventType, Map<string, Listener<DomainEventType>>>()

  on<Type extends DomainEventType>(eventType: Type, key: string, listener: Listener<Type>): void {
    const existing = this.listeners.get(eventType) ?? new Map<string, Listener<DomainEventType>>()
    existing.set(key, listener as unknown as Listener<DomainEventType>)
    this.listeners.set(eventType, existing)
  }

  async publish(event: DomainEvent, db: DbClient): Promise<void> {
    logger.debug("event.publish", { eventId: event.eventId, eventType: event.eventType, storeId: event.storeId })
    const listeners = this.listeners.get(event.eventType)?.values() ?? []
    for (const listener of listeners) {
      await listener(event, db)
    }
  }
}

const globalForEventBus = globalThis as unknown as { eventBus?: EventBus }

export const eventBus = globalForEventBus.eventBus ?? new EventBus()

if (process.env.NODE_ENV !== "production") {
  globalForEventBus.eventBus = eventBus
}

/** Builds a fully-formed envelope around a payload — fills `eventId`/`occurredAt`. */
export function createEvent<Type extends DomainEventType>(
  eventType: Type,
  storeId: string,
  triggeredByUserId: string | null,
  payload: DomainEventOf<Type>["payload"],
): DomainEventOf<Type> {
  return {
    eventId: crypto.randomUUID(),
    eventType,
    occurredAt: new Date().toISOString(),
    storeId,
    triggeredByUserId,
    payload,
  } as DomainEventOf<Type>
}
