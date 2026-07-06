import type { StatusConfig } from "@/components/shared"
import type { IngredientUnit } from "./types"

export const INGREDIENT_STATUS_CONFIG: Record<string, StatusConfig> = {
  ACTIVE: { label: "Ativo", tone: "success" },
  INACTIVE: { label: "Inativo", tone: "neutral" },
}

export const MOVEMENT_TYPE_CONFIG: Record<string, StatusConfig> = {
  ENTRY: { label: "Entrada", tone: "success" },
  EXIT: { label: "Saída", tone: "neutral" },
  ADJUSTMENT: { label: "Ajuste", tone: "info" },
  LOSS: { label: "Perda", tone: "danger" },
  SALE_CONSUMPTION: { label: "Consumo (venda)", tone: "warning" },
  SALE_REVERSAL: { label: "Estorno (cancelamento)", tone: "info" },
}

export const ALERT_SEVERITY_CONFIG: Record<string, StatusConfig> = {
  NEGATIVE: { label: "Negativo", tone: "danger" },
  OUT: { label: "Zerado", tone: "danger" },
  LOW: { label: "Baixo", tone: "warning" },
}

export const UNIT_LABEL: Record<IngredientUnit, string> = {
  G: "g",
  ML: "ml",
  UN: "un",
}

/** "1500 g", "2.5 un" — quantities are decimals in the ingredient's base unit. */
export function formatQuantity(value: number, unit: IngredientUnit): string {
  const formatted = Number.isInteger(value) ? String(value) : value.toLocaleString("pt-BR", { maximumFractionDigits: 3 })
  return `${formatted} ${UNIT_LABEL[unit]}`
}

/** Cost in decimal cents → "R$ 0,0050/g". More precision than formatCents on purpose. */
export function formatUnitCost(centsPerUnit: number, unit: IngredientUnit): string {
  const reais = centsPerUnit / 100
  return `R$ ${reais.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}/${UNIT_LABEL[unit]}`
}
