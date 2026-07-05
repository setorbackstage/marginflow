import type { StatusConfig } from "@/components/shared"

export const CUSTOMER_STATUS_CONFIG: Record<string, StatusConfig> = {
  ACTIVE: { label: "Ativo", tone: "success" },
  BLOCKED: { label: "Bloqueado", tone: "danger" },
}

export const ADDRESS_LABEL_TEXT: Record<string, string> = {
  HOME: "Casa",
  WORK: "Trabalho",
  OTHER: "Outro",
}
