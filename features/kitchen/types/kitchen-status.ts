/**
 * Kitchen statuses are one-directional, mirroring the Order lifecycle.
 *
 * Ticket:  QUEUED → PREPARING → READY
 * Item:    PENDING → PREPARING → READY
 *
 * Both can be CANCELLED if the parent Order is cancelled.
 */

export enum KitchenTicketStatus {
  Queued = "QUEUED",
  Preparing = "PREPARING",
  Ready = "READY",
  Cancelled = "CANCELLED",
}

export enum KitchenItemStatus {
  Pending = "PENDING",
  Preparing = "PREPARING",
  Ready = "READY",
  Cancelled = "CANCELLED",
}
