import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/server/db"
import { mapMfStatusToOd } from "@/server/integrations/opendelivery"
import { logger } from "@/server/lib"

// ─────────────────────────────────────────────────────────────────────────
// GET /api/od/v2/orders/{orderId}
//
// Open Delivery v2 order snapshot. `status` is the authoritative source of truth
// (per the protocol). Returns the order in Open Delivery shape so any
// Open Delivery-compatible Ordering Application can reconcile against it.
// ─────────────────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
): Promise<NextResponse> {
  const { orderId } = await params

  const order = await prisma.order.findFirst({ where: { externalId: orderId } })
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 })
  }

  const odStatus = mapMfStatusToOd(
    order.status as "PENDING" | "CONFIRMED" | "PREPARING" | "READY" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED" | "CONCLUDED",
  )

  const items = await prisma.orderItem.findMany({ where: { orderId: order.id } })

  logger.debug("opendelivery.order.get", { orderId, status: odStatus })

  return NextResponse.json({
    id: order.externalId ?? order.id,
    displayId: String(order.number),
    createdAt: order.createdAt,
    status: odStatus,
    items: items.map((it: { productName: string; quantity: number; unitTotal: number; selectedModifiers?: unknown }) => ({
      name: it.productName,
      quantity: it.quantity,
      unitPrice: Math.round((it.unitTotal ?? 0) / Math.max(1, it.quantity) / 100),
      options: Array.isArray(it.selectedModifiers)
        ? (it.selectedModifiers as { name: string; priceAdjustment: number }[]).map((m) => ({
            name: m.name,
            priceAdjustment: (m.priceAdjustment ?? 0) / 100,
          }))
        : [],
    })),
    total: {
      subtotal: Math.round((order.itemsTotal ?? 0) / 100),
      discounts: Math.round((order.discountTotal ?? 0) / 100),
      deliveryFee: Math.round((order.deliveryFee ?? 0) / 100),
      grandTotal: Math.round((order.grandTotal ?? 0) / 100),
    },
  })
}
