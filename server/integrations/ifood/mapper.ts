import "server-only"
import type { IfoodOrder } from "./orders"

// ── Output types (what we create in our DB) ──────────────────────────────────

export interface MappedModifier {
  name: string
  priceAdjustment: number
}

export interface MappedOrderItem {
  productName: string
  /** Cents */
  productPrice: number
  quantity: number
  selectedModifiers: MappedModifier[]
  /** Cents */
  unitTotal: number
  /** Cents */
  subtotal: number
  notes: string | null
}

export interface MappedDeliveryAddress {
  street: string
  number: string
  complement: string | null
  neighborhood: string
  city: string
  state: string
  postalCode: string
  country: string
  latitude: number | null
  longitude: number | null
}

export interface MappedMarketplaceOrder {
  externalId: string
  /** "DELIVERY" | "TAKEAWAY" | "DINE_IN" */
  type: string
  channel: "MARKETPLACE"
  customerName: string | null
  customerPhone: string | null
  deliveryAddress: MappedDeliveryAddress | null
  /** Cents */
  itemsTotal: number
  /** Cents */
  discountTotal: number
  /** Cents */
  deliveryFee: number
  /** Cents */
  grandTotal: number
  notes: string | null
  scheduledFor: Date | null
  items: MappedOrderItem[]
  /** Whether iFood handles logistics ("IFOOD") or the merchant does ("MERCHANT"). */
  deliveredBy: string | null
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** iFood uses BRL floats; we use integer cents. */
function toCents(value: number): number {
  return Math.round(value * 100)
}

function mapOrderType(ifoodType: string): string {
  switch (ifoodType.toUpperCase()) {
    case "DELIVERY": return "DELIVERY"
    case "TAKEOUT":  return "TAKEAWAY"
    case "INDOOR":   return "DINE_IN"
    default:         return "DELIVERY"
  }
}

function mapPhone(phone?: { number?: string; localizer?: string }): string | null {
  if (!phone?.number) return null
  const localizer = phone.localizer ?? ""
  return `${localizer}${phone.number}`.replace(/\s+/g, "")
}

// ── Mapper ───────────────────────────────────────────────────────────────────

export function mapIfoodOrder(ifoodOrder: IfoodOrder): MappedMarketplaceOrder {
  const items: MappedOrderItem[] = ifoodOrder.items.map((item) => {
    const modifiers: MappedModifier[] = (item.optionGroups ?? []).flatMap((group) =>
      (group.options ?? []).map((opt) => ({
        name: opt.name,
        priceAdjustment: toCents(opt.addition),
      })),
    )

    const productPrice = toCents(item.unitPrice)
    const modifierTotal = modifiers.reduce((sum, m) => sum + m.priceAdjustment, 0)
    const unitTotal = productPrice + modifierTotal
    const subtotal = unitTotal * item.quantity

    return {
      productName: item.name,
      productPrice,
      quantity: item.quantity,
      selectedModifiers: modifiers,
      unitTotal,
      subtotal,
      notes: item.observations ?? null,
    }
  })

  const itemsTotal = items.reduce((sum, i) => sum + i.subtotal, 0)
  const deliveryFee = toCents(ifoodOrder.total.deliveryFee)
  // benefits is negative in iFood response (discounts)
  const discountTotal = toCents(Math.abs(Math.min(0, ifoodOrder.total.benefits)))
  const grandTotal = itemsTotal - discountTotal + deliveryFee

  let deliveryAddress: MappedDeliveryAddress | null = null
  const addr = ifoodOrder.delivery?.deliveryAddress
  if (addr) {
    deliveryAddress = {
      street: addr.streetName ?? "",
      number: addr.streetNumber ?? "S/N",
      complement: addr.complement ?? null,
      neighborhood: addr.neighborhood ?? "",
      city: addr.city ?? "",
      state: addr.state ?? "",
      postalCode: addr.postalCode ?? "",
      country: addr.country ?? "BR",
      latitude: addr.coordinates?.latitude ?? null,
      longitude: addr.coordinates?.longitude ?? null,
    }
  }

  const scheduledFor =
    ifoodOrder.orderTiming === "SCHEDULED" && ifoodOrder.preparationStartDateTime
      ? new Date(ifoodOrder.preparationStartDateTime)
      : null

  return {
    externalId: ifoodOrder.id,
    type: mapOrderType(ifoodOrder.orderType),
    channel: "MARKETPLACE",
    customerName: ifoodOrder.customer?.name ?? null,
    customerPhone: mapPhone(ifoodOrder.customer?.phone),
    deliveryAddress,
    itemsTotal,
    discountTotal,
    deliveryFee,
    grandTotal,
    notes: null,
    scheduledFor,
    items,
    deliveredBy: ifoodOrder.delivery?.deliveredBy ?? null,
  }
}
