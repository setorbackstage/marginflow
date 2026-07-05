import type { StatusConfig } from "@/components/shared"

export const DELIVERY_STATUS_CONFIG: Record<string, StatusConfig> = {
  AWAITING_PICKUP: { label: "Aguardando", tone: "neutral" },
  DISPATCHED: { label: "Despachado", tone: "info" },
  IN_TRANSIT: { label: "Em rota", tone: "info" },
  DELIVERED: { label: "Entregue", tone: "success" },
  FAILED: { label: "Falhou", tone: "danger" },
  RETURNED: { label: "Devolvido", tone: "warning" },
}
