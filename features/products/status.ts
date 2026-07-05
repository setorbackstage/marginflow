import type { StatusConfig } from "@/components/shared"

export const PRODUCT_STATUS_CONFIG: Record<string, StatusConfig> = {
  ACTIVE: { label: "Ativo", tone: "success" },
  INACTIVE: { label: "Inativo", tone: "neutral" },
  OUT_OF_STOCK: { label: "Sem estoque", tone: "warning" },
}
