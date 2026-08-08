"use client"

import * as React from "react"
import { Pencil, Check, TriangleAlert } from "lucide-react"

import { useCreateMovement } from "@/features/inventory"
import type { Ingredient } from "@/features/inventory/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { formatQuantity } from "@/features/inventory"

/**
 * Inline stock adjustment: click the balance to open a quick editor.
 * Saves via an ADJUSTMENT movement (new balance - current balance).
 */
export function InlineStockEditor({ ingredient }: { ingredient: Ingredient }) {
  const create = useCreateMovement()
  const [open, setOpen] = React.useState(false)

  // Use key-change to reset value on ingredient change — avoids calling
  // setState inside useEffect (react-hooks/set-state-in-effect lint error).
  const [value, setValue] = React.useState(String(ingredient.currentStock))

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) setValue(String(ingredient.currentStock))
    setOpen(isOpen)
  }

  const handleApply = () => {
    const next = Number(value)
    if (Number.isNaN(next) || next === ingredient.currentStock) {
      setOpen(false)
      return
    }
    const delta = next - ingredient.currentStock
    create.mutate(
      {
        ingredientId: ingredient.id,
        type: "ADJUSTMENT",
        direction: delta > 0 ? "INCREASE" : "DECREASE",
        quantity: Math.abs(delta),
        reason: "Ajuste rápido pela tabela",
      },
      {
        onSuccess: () => setOpen(false),
      },
    )
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="group/stock inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-left tabular-nums transition-colors hover:bg-muted"
            aria-label="Ajustar saldo"
          >
            <span
              className={cnBadge(ingredient)}
            >
              {formatQuantity(ingredient.currentStock, ingredient.unit)}
            </span>
            {ingredient.isLowStock ? (
              <TriangleAlert className="inline size-3.5 align-[-2px] text-amber-600 dark:text-amber-500" />
            ) : null}
            <Pencil className="size-3 opacity-0 transition-opacity group-hover/stock:opacity-100" />
          </button>
        }
      />
      <PopoverContent className="w-56 space-y-2" align="start">
        <p className="text-xs font-medium text-muted-foreground">
          Ajustar saldo de {ingredient.name}
        </p>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            step="any"
            value={value}
            autoFocus
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleApply()
              if (e.key === "Escape") setOpen(false)
            }}
            className="tabular-nums"
          />
          <Button size="icon-sm" onClick={handleApply} disabled={create.isPending}>
            {create.isPending ? <Check className="animate-spin" /> : <Check />}
          </Button>
        </div>
        <p className="text-[0.7rem] text-muted-foreground">
          Saldo atual: {formatQuantity(ingredient.currentStock, ingredient.unit)}
        </p>
      </PopoverContent>
    </Popover>
  )
}

function cnBadge(ingredient: Ingredient): string {
  return cn(
    "tabular-nums",
    ingredient.currentStock < 0 && "font-semibold text-destructive",
    ingredient.isLowStock &&
      ingredient.currentStock >= 0 &&
      "font-medium text-amber-600 dark:text-amber-500",
  )
}

// local cn to avoid extra import churn
function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ")
}
