"use client"

import * as React from "react"
import { Calculator } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Field, FieldLabel, FieldDescription, FieldGroup } from "@/components/ui/field"
import { UNIT_LABEL, formatUnitCost } from "@/features/inventory/status"
import { PACKAGE_TYPES, SIZE_UNIT_OPTIONS, calculatePurchase } from "@/features/inventory/purchase-calculator"
import type { IngredientUnit } from "@/features/inventory/types"

/**
 * Sprint 3 "Cadastro Inteligente de Insumos" — a collapsible helper that
 * turns "comprei 2 sacos de 25kg por R$120" into base-unit quantity + cost.
 * Emits the result via `onApply`; the caller decides what to do with it
 * (fill the ingredient's opening cost, or a stock-entry movement's
 * quantity/cost) — this component never submits anything itself.
 */
export function PurchaseCalculator({ baseUnit, onApply }: { baseUnit: IngredientUnit; onApply: (result: { quantity: number; costPerUnit: number }) => void }) {
  const [expanded, setExpanded] = React.useState(false)
  const [packageType, setPackageType] = React.useState<string>(PACKAGE_TYPES[0])
  const [packageCount, setPackageCount] = React.useState("")
  const [packageSize, setPackageSize] = React.useState("")
  const sizeUnits = SIZE_UNIT_OPTIONS[baseUnit]
  const [sizeUnit, setSizeUnit] = React.useState(sizeUnits[0]!.value)
  const [totalPrice, setTotalPrice] = React.useState("")

  // Adjust state during render when `baseUnit` changes (e.g. switching
  // ingredients) rather than in an effect — the React-docs-endorsed pattern
  // for resetting derived state on a prop change, avoiding an extra render.
  const [prevBaseUnit, setPrevBaseUnit] = React.useState(baseUnit)
  if (baseUnit !== prevBaseUnit) {
    setPrevBaseUnit(baseUnit)
    setSizeUnit(SIZE_UNIT_OPTIONS[baseUnit][0]!.value)
  }

  const count = Number(packageCount) || 0
  const size = Number(packageSize) || 0
  const price = Number(totalPrice) || 0
  const toBase = sizeUnits.find((u) => u.value === sizeUnit)?.toBase ?? 1
  const { totalBaseQuantity, costPerBaseUnit } = calculatePurchase({
    packageCount: count,
    packageSize: size,
    sizeUnitToBase: toBase,
    totalPriceCents: Math.round(price * 100),
  })
  const canApply = totalBaseQuantity > 0

  if (!expanded) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setExpanded(true)}>
        <Calculator data-icon="inline-start" />
        Calcular pelo que comprei
      </Button>
    )
  }

  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">Como você comprou esse insumo?</p>
        <Button type="button" variant="ghost" size="xs" onClick={() => setExpanded(false)}>
          Fechar
        </Button>
      </div>
      <FieldGroup>
        <div className="grid grid-cols-2 gap-2">
          <Field>
            <FieldLabel htmlFor="calc-package-type">Embalagem</FieldLabel>
            <Select value={packageType} onValueChange={(value) => value && setPackageType(value)}>
              <SelectTrigger id="calc-package-type" className="w-full">
                <SelectValue>{packageType}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {PACKAGE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="calc-package-count">Quantas comprou</FieldLabel>
            <Input id="calc-package-count" type="number" min="0" step="1" value={packageCount} onChange={(e) => setPackageCount(e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field>
            <FieldLabel htmlFor="calc-package-size">Tamanho de cada uma</FieldLabel>
            <div className="flex gap-1.5">
              <Input id="calc-package-size" type="number" min="0" step="0.001" value={packageSize} onChange={(e) => setPackageSize(e.target.value)} />
              {sizeUnits.length > 1 ? (
                <Select value={sizeUnit} onValueChange={(value) => value && setSizeUnit(value)}>
                  <SelectTrigger className="w-16 shrink-0">
                    <SelectValue>{sizeUnits.find((u) => u.value === sizeUnit)?.label}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {sizeUnits.map((u) => (
                      <SelectItem key={u.value} value={u.value}>
                        {u.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="flex items-center px-2 text-sm text-muted-foreground">{sizeUnits[0]!.label}</span>
              )}
            </div>
          </Field>
          <Field>
            <FieldLabel htmlFor="calc-total-price">Preço total pago (R$)</FieldLabel>
            <Input id="calc-total-price" type="number" min="0" step="0.01" value={totalPrice} onChange={(e) => setTotalPrice(e.target.value)} />
          </Field>
        </div>
      </FieldGroup>
      <FieldDescription>
        {canApply
          ? `= ${totalBaseQuantity.toLocaleString("pt-BR")} ${UNIT_LABEL[baseUnit]} · ${formatUnitCost(costPerBaseUnit, baseUnit)}`
          : "Preencha os campos para calcular."}
      </FieldDescription>
      <Button
        type="button"
        size="sm"
        disabled={!canApply}
        onClick={() => onApply({ quantity: totalBaseQuantity, costPerUnit: costPerBaseUnit / 100 })}
      >
        Usar esses valores
      </Button>
    </div>
  )
}
