"use client"

import * as React from "react"
import { Loader2, Minus, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCents } from "@/lib/format"
import { useModifierGroups } from "@/features/products/hooks"
import type { ProductListItem } from "@/features/products/types"
import type { CartItem } from "./create-order-dialog"

/**
 * Modal for picking modifiers/quantity/notes for one product before adding it
 * to the order draft's cart. Enforces each modifier group's min/max selection
 * count client-side (mirrors the backend's Business Rules 11-14) so the user
 * gets immediate feedback instead of a round-trip error on submit.
 *
 * Callers must render this with `key={product?.id}` — quantity/notes/selected
 * reset by remounting on a new product identity rather than via an effect.
 */
export function AddItemDialog({
  open,
  onOpenChange,
  product,
  onAdd,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: ProductListItem | null
  onAdd: (item: CartItem) => void
}) {
  const { data: groups, isLoading } = useModifierGroups(product?.id)
  const [quantity, setQuantity] = React.useState(1)
  const [notes, setNotes] = React.useState("")
  const [selected, setSelected] = React.useState<Record<string, Set<string>>>({})

  if (!product) return null

  const toggleModifier = (groupId: string, modifierId: string, max: number) => {
    setSelected((prev) => {
      const current = new Set(prev[groupId] ?? [])
      if (current.has(modifierId)) {
        current.delete(modifierId)
      } else {
        if (current.size >= max) return prev
        current.add(modifierId)
      }
      return { ...prev, [groupId]: current }
    })
  }

  const missingRequired = (groups ?? []).some((g) => g.isRequired && (selected[g.id]?.size ?? 0) < g.minSelections)

  const modifierTotal = (groups ?? []).reduce((sum, group) => {
    const picked = selected[group.id]
    if (!picked) return sum
    return sum + group.modifiers.filter((m) => picked.has(m.id)).reduce((s, m) => s + m.priceAdjustment, 0)
  }, 0)
  const unitTotal = product.price + modifierTotal

  const handleAdd = () => {
    const selectedModifiers = (groups ?? []).flatMap((group) => {
      const picked = selected[group.id]
      if (!picked) return []
      return group.modifiers
        .filter((m) => picked.has(m.id))
        .map((m) => ({ modifierId: m.id, modifierGroupId: group.id, name: m.name, priceAdjustment: m.priceAdjustment }))
    })
    onAdd({
      productId: product.id,
      productName: product.name,
      unitPrice: product.price,
      quantity,
      selectedModifiers,
      notes: notes || null,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
        </DialogHeader>

        <div className="max-h-[50vh] space-y-4 overflow-y-auto">
          {isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            (groups ?? []).map((group) => (
              <div key={group.id}>
                <p className="mb-1.5 text-sm font-medium">
                  {group.name}
                  {group.isRequired ? <span className="text-destructive"> *</span> : null}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    (min {group.minSelections}, máx {group.maxSelections})
                  </span>
                </p>
                <div className="space-y-1.5">
                  {group.modifiers.map((modifier) => (
                    <Label key={modifier.id} className="flex items-center gap-2 rounded-lg border p-2 text-sm font-normal">
                      <Checkbox
                        checked={selected[group.id]?.has(modifier.id) ?? false}
                        onCheckedChange={() => toggleModifier(group.id, modifier.id, group.maxSelections)}
                      />
                      <span className="flex-1">{modifier.name}</span>
                      {modifier.priceAdjustment !== 0 ? (
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {modifier.priceAdjustment > 0 ? "+" : ""}
                          {formatCents(modifier.priceAdjustment)}
                        </span>
                      ) : null}
                    </Label>
                  ))}
                </div>
              </div>
            ))
          )}

          <div>
            <Label htmlFor="item-notes" className="mb-1.5">
              Observações (opcional)
            </Label>
            <Textarea id="item-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Quantidade</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon-sm" onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Diminuir quantidade">
                <Minus />
              </Button>
              <span className="w-6 text-center tabular-nums">{quantity}</span>
              <Button variant="outline" size="icon-sm" onClick={() => setQuantity((q) => q + 1)} aria-label="Aumentar quantidade">
                <Plus />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleAdd} disabled={missingRequired || isLoading}>
            Adicionar · {formatCents(unitTotal * quantity)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
