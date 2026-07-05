import type { StatusConfig } from "@/components/shared"
import type { OrderStatus } from "./types"

export const ORDER_STATUS_CONFIG: Record<string, StatusConfig> = {
  DRAFT: { label: "Rascunho", tone: "neutral" },
  PENDING: { label: "Pendente", tone: "warning" },
  CONFIRMED: { label: "Confirmado", tone: "info" },
  PREPARING: { label: "Preparando", tone: "info" },
  READY: { label: "Pronto", tone: "success" },
  OUT_FOR_DELIVERY: { label: "Em entrega", tone: "info" },
  DELIVERED: { label: "Entregue", tone: "success" },
  CANCELLED: { label: "Cancelado", tone: "danger" },
}

export const ORDER_TYPE_LABEL: Record<string, string> = {
  DELIVERY: "Entrega",
  TAKEAWAY: "Retirada",
  DINE_IN: "Salão",
}

export const ORDER_CHANNEL_LABEL: Record<string, string> = {
  IN_STORE: "Presencial",
  PHONE: "Telefone",
  MARKETPLACE: "Marketplace",
  WHATSAPP: "WhatsApp",
  KIOSK: "Totem",
}

/**
 * Transitions this app's "Avançar status" action can request via
 * `POST /orders/:orderId/status`. Mirrors API_SPEC.md's Allowed Transitions
 * table — PREPARING/READY/OUT_FOR_DELIVERY are system-derived (owned by
 * Kitchen/Delivery) and never offered here.
 */
export const CLIENT_ORDER_TRANSITIONS: Partial<Record<OrderStatus, { target: OrderStatus; label: string }[]>> = {
  DRAFT: [{ target: "PENDING", label: "Enviar pedido" }],
  PENDING: [{ target: "CONFIRMED", label: "Confirmar pedido" }],
  READY: [{ target: "DELIVERED", label: "Marcar como retirado" }], // TAKEAWAY only
}

export const CANCELLABLE_STATUSES: OrderStatus[] = ["DRAFT", "PENDING", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY"]
