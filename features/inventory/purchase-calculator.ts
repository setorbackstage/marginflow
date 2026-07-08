import type { IngredientUnit } from "./types"

/** Sprint 3 "Embalagens" — purely descriptive labels for how a purchase is packaged; not persisted, only used to drive the calculator's UX. */
export const PACKAGE_TYPES = [
  "Pacote",
  "Caixa",
  "Fardo",
  "Lata",
  "Vidro",
  "Garrafa",
  "Saco",
  "Balde",
  "Unidade",
  "Litro",
  "Quilo",
  "Metro",
  "Cento",
] as const

export type PackageType = (typeof PACKAGE_TYPES)[number]

/** The size unit a package's contents can be entered in, per the ingredient's base (storage) unit. */
export const SIZE_UNIT_OPTIONS: Record<IngredientUnit, { value: string; label: string; toBase: number }[]> = {
  G: [
    { value: "g", label: "g", toBase: 1 },
    { value: "kg", label: "kg", toBase: 1000 },
  ],
  ML: [
    { value: "ml", label: "ml", toBase: 1 },
    { value: "l", label: "L", toBase: 1000 },
  ],
  UN: [{ value: "un", label: "un", toBase: 1 }],
}

/**
 * Sprint 3 "Cadastro Inteligente de Insumos" — converts a real-world purchase
 * (e.g. "2 sacos de 25kg por R$120") into the base-unit quantity and cost the
 * rest of the system already works in. Pure UX sugar: the result still flows
 * through the exact same `quantity`/`costPerUnit` fields every other entry
 * path uses — no new calculation rule, no schema change to StockMovement.
 */
export function calculatePurchase(input: {
  packageCount: number
  packageSize: number
  sizeUnitToBase: number
  totalPriceCents: number
}): { totalBaseQuantity: number; costPerBaseUnit: number } {
  const totalBaseQuantity = input.packageCount * input.packageSize * input.sizeUnitToBase
  const costPerBaseUnit = totalBaseQuantity > 0 ? input.totalPriceCents / totalBaseQuantity : 0
  return { totalBaseQuantity, costPerBaseUnit }
}
