import type { Brand } from "@/types/common"

export type CourierId = Brand<string, "CourierId">

/** Whether the courier is internal staff or assigned by an external platform. */
export enum CourierType {
  Internal = "INTERNAL",
  Platform = "PLATFORM",
}

/** Third-party delivery platform. Only relevant when courierType = PLATFORM. */
export enum DeliveryPlatform {
  IFood = "IFOOD",
  Rappi = "RAPPI",
  UberEats = "UBER_EATS",
  Loggi = "LOGGI",
  Other = "OTHER",
}

/**
 * A courier represents the physical person or automated platform responsible
 * for transporting an Order from the Store to the Customer.
 *
 * For internal couriers, this is a named staff member.
 * For platform couriers, it is the external delivery system.
 */
export interface Courier {
  readonly id: CourierId
  readonly type: CourierType
  readonly name: string
  readonly phone: string | null
  readonly platform: DeliveryPlatform | null // null when type = INTERNAL
  readonly platformCourierId: string | null  // external platform's courier identifier
}
