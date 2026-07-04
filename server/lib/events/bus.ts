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
 */
class EventBus {
  private readonly listeners = new Map<DomainEventType, Listener<DomainEventType>[]>()

  on<Type extends DomainEventType>(eventType: Type, listener: Listener<Type>): void {
    const existing = this.listeners.get(eventType) ?? []
    existing.push(listener as unknown as Listener<DomainEventType>)
    this.listeners.set(eventType, existing)
  }

  async publish(event: DomainEvent, db: DbClient): Promise<void> {
    logger.debug("event.publish", { eventId: event.eventId, eventType: event.eventType, storeId: event.storeId })
    const listeners = this.listeners.get(event.eventType) ?? []
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
