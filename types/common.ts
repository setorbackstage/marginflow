/**
 * Shared primitive type aliases and utilities used across the entire domain.
 *
 * These types prevent primitive obsession and carry semantic meaning.
 * Import from here when you need foundational types — never redefine them locally.
 */

/** ISO 8601 datetime string (e.g., "2025-07-02T14:30:00.000Z"). Always stored in UTC. */
export type ISODateTime = string

/**
 * Monetary value always represented as integer cents to avoid floating-point errors.
 *
 * R$10,99 → 1099
 * R$0,50 → 50
 *
 * Never use `number` directly for money. Always use `Cents`.
 */
export type Cents = number

/**
 * Branded type — creates a nominal type over a structural primitive.
 * Prevents accidentally assigning one ID type to another at compile time.
 *
 * @example
 * type OrderId = Brand<string, 'OrderId'>
 * type StoreId = Brand<string, 'StoreId'>
 *
 * declare const orderId: OrderId
 * declare const storeId: StoreId
 * storeId = orderId  // ← TypeScript error
 */
export type Brand<T, K extends string> = T & { readonly __brand: K }

/** A single operating time window within a day. Uses 24-hour 'HH:MM' format. */
export interface TimeSlot {
  readonly open: string   // e.g., '08:00'
  readonly close: string  // e.g., '22:30'
}

/** Availability configuration for a single day of the week. */
export interface DaySchedule {
  readonly isOpen: boolean
  readonly slots: readonly TimeSlot[]
}

/**
 * Full weekly availability schedule.
 * Used by Stores (operating hours) and Products (availability windows).
 */
export interface WeeklySchedule {
  readonly monday: DaySchedule
  readonly tuesday: DaySchedule
  readonly wednesday: DaySchedule
  readonly thursday: DaySchedule
  readonly friday: DaySchedule
  readonly saturday: DaySchedule
  readonly sunday: DaySchedule
}
