import { NextResponse } from "next/server"

// ─────────────────────────────────────────────────────────────────────────
// GET /api/od/v2/discovery
//
// Open Delivery v2 Discovery declaration (well-known capabilities).
// Declares this MarginFlow instance as a Software Service receiver that supports
// both webhook push and polling, and lists the operations/events it honors.
// Reference: docs/reference/v2/discovery.openapi.yaml
// ─────────────────────────────────────────────────────────────────────────

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    capabilities: {
      orders: {
        version: "2.0.0-rc",
        supported: true,
        receiver: {
          supported: true,
          supportedOperations: [
            "confirmOrder",
            "setOrderPreparing",
            "setOrderReadyForPickup",
            "dispatchOrder",
            "setOrderDelivered",
            "requestCancellation",
            "getOrder",
          ],
          unsupportedOperations: [],
          supportsWebhook: true,
          supportsPolling: true,
          supportedEvents: [
            "CREATED",
            "CONFIRMED",
            "PREPARING",
            "READY_FOR_PICKUP",
            "DISPATCHED",
            "DELIVERED",
            "CANCELLED",
            "CONCLUDED",
          ],
        },
      },
    },
  })
}
