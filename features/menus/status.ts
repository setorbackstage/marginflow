import type { StatusConfig } from "@/components/shared"

export const MENU_STATUS_CONFIG: Record<string, StatusConfig> = {
  ACTIVE: { label: "Publicado", tone: "success" },
  INACTIVE: { label: "Despublicado", tone: "neutral" },
  SCHEDULED: { label: "Agendado", tone: "warning" },
}

export const MENU_CHANNEL_LABEL: Record<string, string> = {
  DELIVERY: "Delivery",
  IN_STORE: "Presencial",
  MARKETPLACE: "Marketplace",
  KIOSK: "Totem",
}
