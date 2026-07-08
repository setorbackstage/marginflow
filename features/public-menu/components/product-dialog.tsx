"use client"

import * as React from "react"
import Image from "next/image"
import { Minus, Plus, ImageOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { formatCents } from "@/lib/format"
import type { PublicProduct, CartLineSelection } from "../types"

export function ProductDialog({
  product,
  open,
  onOpenChange,
  onAdd,
}: {
  product: PublicProduct | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (input: {
    quantity: number
    selections: CartLineSelection[]
    notes: string | null
  }) => void
}) {
  const [quantity, setQuantity] = React.useState(1)
  const [selectedByGroup, setSelectedByGroup] = React.useState<
    Record<string, string[]>
  >({})
  const [notes, setNotes] = React.useState("")

  if (!product) return null

  const toggleModifier = (groupId: string, modifierId: string, max: number) => {
    setSelectedByGroup((prev) => {
      const current = prev[groupId] ?? []
      if (current.includes(modifierId)) {
        return {
          ...prev,
          [groupId]: current.filter((id) => id !== modifierId),
        }
      }
      const next =
        max === 1 ? [modifierId] : [...current, modifierId].slice(-max)
      return { ...prev, [groupId]: next }
    })
  }

  const missingRequired = product.modifierGroups.some(
    (group) =>
      group.isRequired &&
      (selectedByGroup[group.id] ?? []).length <
        Math.max(1, group.minSelections),
  )

  const selections: CartLineSelection[] = product.modifierGroups.flatMap(
    (group) =>
      (selectedByGroup[group.id] ?? []).map((modifierId) => {
        const modifier = group.modifiers.find((m) => m.id === modifierId)!
        return {
          modifierGroupId: group.id,
          modifierId,
          name: modifier.name,
          priceAdjustment: modifier.priceAdjustment,
        }
      }),
  )

  const unitTotal =
    product.price + selections.reduce((s, sel) => s + sel.priceAdjustment, 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          {product.imageUrl ? (
            <div className="relative -mx-6 -mt-6 mb-2 aspect-video overflow-hidden">
              <Image
                src={product.imageUrl}
                alt=""
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          ) : (
            <div className="-mx-6 -mt-6 mb-2 flex aspect-video items-center justify-center bg-muted text-muted-foreground">
              <ImageOff className="size-8" />
            </div>
          )}
          <DialogTitle>{product.name}</DialogTitle>
          {product.description ? (
            <DialogDescription>{product.description}</DialogDescription>
          ) : null}
        </DialogHeader>

        <div className="space-y-4">
          {product.modifierGroups.map((group) => (
            <div key={group.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{group.name}</p>
                {group.isRequired ? (
                  <span className="text-xs text-muted-foreground">
                    Obrigatório
                  </span>
                ) : null}
              </div>
              {group.description ? (
                <p className="text-xs text-muted-foreground">
                  {group.description}
                </p>
              ) : null}
              <div className="space-y-1.5">
                {group.modifiers.map((modifier) => {
                  const checked = (selectedByGroup[group.id] ?? []).includes(
                    modifier.id,
                  )
                  return (
                    <label
                      key={modifier.id}
                      className="flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted"
                    >
                      <span className="flex items-center gap-2">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() =>
                            toggleModifier(
                              group.id,
                              modifier.id,
                              group.maxSelections || 1,
                            )
                          }
                        />
                        {modifier.name}
                      </span>
                      {modifier.priceAdjustment !== 0 ? (
                        <span className="text-muted-foreground tabular-nums">
                          {modifier.priceAdjustment > 0 ? "+" : ""}
                          {formatCents(modifier.priceAdjustment)}
                        </span>
                      ) : null}
                    </label>
                  )
                })}
              </div>
            </div>
          ))}

          <div className="space-y-1.5">
            <p className="text-sm font-medium">Alguma observação?</p>
            <Textarea
              rows={2}
              placeholder="Ex: sem cebola"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              aria-label="Diminuir quantidade"
            >
              <Minus />
            </Button>
            <span className="w-6 text-center text-base font-medium tabular-nums">
              {quantity}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setQuantity((q) => q + 1)}
              aria-label="Aumentar quantidade"
            >
              <Plus />
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button
            className="w-full"
            disabled={missingRequired}
            onClick={() => {
              onAdd({ quantity, selections, notes: notes.trim() || null })
              onOpenChange(false)
            }}
          >
            Adicionar · {formatCents(unitTotal * quantity)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
