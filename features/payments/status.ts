import type { StatusConfig } from "@/components/shared"

export const PAYMENT_STATUS_CONFIG: Record<string, StatusConfig> = {
  PENDING: { label: "Pendente", tone: "warning" },
  PAID: { label: "Pago", tone: "success" },
  PARTIALLY_REFUNDED: { label: "Parcialmente reembolsado", tone: "info" },
  REFUNDED: { label: "Reembolsado", tone: "danger" },
}

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH: "Dinheiro",
  CREDIT_CARD: "Cartão de crédito",
  DEBIT_CARD: "Cartão de débito",
  PIX: "PIX",
  VOUCHER: "Vale",
  GIFT_CARD: "Vale-presente",
  ONLINE: "Online",
}
