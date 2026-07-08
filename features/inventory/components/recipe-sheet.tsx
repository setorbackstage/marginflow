"use client"

import * as React from "react"
import { Plus, Trash2, ClipboardList, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxCollection,
  ComboboxItem,
  ComboboxEmpty,
} from "@/components/ui/combobox"
import { Skeleton } from "@/components/ui/skeleton"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Field, FieldLabel } from "@/components/ui/field"
import { EmptyState, ErrorState, ConfirmDialog } from "@/components/shared"
import { formatCents } from "@/lib/format"
import { useIngredients, useRecipe, useUpsertRecipe, useDeleteRecipe } from "@/features/inventory/hooks"
import { UNIT_LABEL } from "@/features/inventory/status"

interface DraftItem {
  ingredientId: string
  quantity: number
  wastePct: number
}

/**
 * Ficha técnica editor. Draft rows are local state initialized from the
 * saved recipe when the sheet opens; PUT replaces the whole item list
 * atomically (API_SPEC.md).
 */
export function RecipeSheet({
  open,
  onOpenChange,
  productId,
  productName,
  productPrice,
  duplicateCandidates = [],
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  productId: string
  productName: string
  productPrice: number
  /** Other products to offer as a "duplicate from" source — omit to hide that action. */
  duplicateCandidates?: { id: string; name: string }[]
}) {
  const recipe = useRecipe(open ? productId : undefined)
  const [duplicateSourceId, setDuplicateSourceId] = React.useState<string | null>(null)
  const duplicateSource = useRecipe(duplicateSourceId ?? undefined)
  // `perPage: 100` — the row-level ingredient picker needs every active
  // ingredient available to search, not just the first page (the plain
  // `{ page: 1 }` default here silently truncated at 20 before).
  const ingredients = useIngredients({ page: 1, perPage: 100 })
  const upsert = useUpsertRecipe(productId)
  const deleteRecipe = useDeleteRecipe(productId)

  const [items, setItems] = React.useState<DraftItem[]>([])
  const [yieldQuantity, setYieldQuantity] = React.useState(1)
  const [notes, setNotes] = React.useState("")
  const [confirmDelete, setConfirmDelete] = React.useState(false)
  const [initializedFor, setInitializedFor] = React.useState<string | null>(null)

  // Adjust-during-render sync (same pattern as useSyncedState elsewhere):
  // seed the draft from the fetched recipe once per open/product.
  const syncKey = open ? `${productId}:${recipe.data?.updatedAt ?? "none"}` : null
  if (syncKey !== initializedFor) {
    setInitializedFor(syncKey)
    if (syncKey !== null && !recipe.isLoading) {
      setItems(
        recipe.data?.items.map((item) => ({
          ingredientId: item.ingredientId,
          quantity: item.quantity,
          wastePct: item.wastePct,
        })) ?? [],
      )
      setYieldQuantity(recipe.data?.yieldQuantity ?? 1)
      setNotes(recipe.data?.notes ?? "")
    }
  }

  const ingredientOptions = ingredients.data?.items ?? []
  const ingredientById = new Map(ingredientOptions.map((ingredient) => [ingredient.id, ingredient]))
  const usedIds = new Set(items.map((item) => item.ingredientId))

  const updateItem = (index: number, patch: Partial<DraftItem>) => {
    setItems((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  // Live cost preview mirroring the server formula (Business Rule 45 applies
  // to history; this is the current-cost projection the GET also returns).
  const safeYield = yieldQuantity > 0 ? yieldQuantity : 1
  const costPerUnit = items.reduce((sum, item) => {
    const ingredient = ingredientById.get(item.ingredientId)
    if (!ingredient || item.quantity <= 0) return sum
    return sum + ((item.quantity * (1 + item.wastePct / 100)) / safeYield) * ingredient.costPerUnit
  }, 0)
  const marginPct = productPrice > 0 ? ((productPrice - costPerUnit) / productPrice) * 100 : null

  const isValid = items.length > 0 && items.every((item) => item.ingredientId && item.quantity > 0)

  const handleSave = () => {
    upsert.mutate(
      {
        yieldQuantity: safeYield,
        notes: notes.trim() || null,
        items: items.map((item) => ({
          ingredientId: item.ingredientId,
          quantity: item.quantity,
          wastePct: item.wastePct,
        })),
      },
      { onSuccess: () => onOpenChange(false) },
    )
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full gap-0 sm:max-w-xl">
          <SheetHeader className="border-b">
            <SheetTitle>Ficha técnica</SheetTitle>
            <SheetDescription>{productName}</SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {recipe.isLoading || ingredients.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : recipe.isError ? (
              <ErrorState error={recipe.error} onRetry={() => recipe.refetch()} />
            ) : ingredientOptions.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="Nenhum insumo cadastrado"
                description="Cadastre insumos na tela de Estoque antes de montar a ficha técnica."
              />
            ) : (
              <>
                {duplicateCandidates.length > 0 ? (
                  <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs font-medium text-muted-foreground">Duplicar ficha de outro produto</p>
                    <Combobox
                      items={duplicateCandidates.map((p) => ({ value: p.id, label: p.name }))}
                      value={duplicateSourceId ? { value: duplicateSourceId, label: duplicateCandidates.find((p) => p.id === duplicateSourceId)?.name ?? "" } : null}
                      onValueChange={(next) => setDuplicateSourceId(next?.value ?? null)}
                    >
                      <ComboboxInput placeholder="Buscar produto..." />
                      <ComboboxContent>
                        <ComboboxEmpty>Nenhum produto encontrado.</ComboboxEmpty>
                        <ComboboxList>
                          <ComboboxCollection>
                            {(option: { value: string; label: string }) => (
                              <ComboboxItem key={option.value} value={option}>
                                {option.label}
                              </ComboboxItem>
                            )}
                          </ComboboxCollection>
                        </ComboboxList>
                      </ComboboxContent>
                    </Combobox>
                    {duplicateSourceId ? (
                      duplicateSource.isLoading ? (
                        <p className="text-xs text-muted-foreground">Carregando ficha...</p>
                      ) : duplicateSource.data ? (
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs text-muted-foreground">
                            {duplicateSource.data.items.length} ingrediente(s) encontrados.
                          </p>
                          <Button
                            type="button"
                            size="xs"
                            onClick={() => {
                              const source = duplicateSource.data!
                              setItems(source.items.map((item) => ({ ingredientId: item.ingredientId, quantity: item.quantity, wastePct: item.wastePct })))
                              setYieldQuantity(source.yieldQuantity)
                              setNotes(source.notes ?? "")
                              setDuplicateSourceId(null)
                            }}
                          >
                            Usar esta ficha
                          </Button>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">Esse produto não tem ficha técnica.</p>
                      )
                    ) : null}
                  </div>
                ) : null}

                <div className="grid grid-cols-2 gap-3">
                  <Field>
                    <FieldLabel htmlFor="recipe-yield">Rendimento (unidades por receita)</FieldLabel>
                    <Input
                      id="recipe-yield"
                      type="number"
                      step="0.001"
                      min="0.001"
                      value={yieldQuantity}
                      onChange={(e) => setYieldQuantity(Number(e.target.value))}
                    />
                  </Field>
                  <div className="flex flex-col justify-end gap-1 rounded-xl border bg-muted/40 px-3 py-2">
                    <p className="text-xs text-muted-foreground">Custo por unidade</p>
                    <p className="text-sm font-semibold tabular-nums">
                      {formatCents(Math.round(costPerUnit))}
                      {marginPct !== null ? (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          margem {marginPct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
                        </span>
                      ) : null}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {items.map((item, index) => {
                    const ingredient = ingredientById.get(item.ingredientId)
                    return (
                      <div key={index} className="grid grid-cols-[1fr_90px_80px_32px] items-end gap-2 rounded-xl border p-3">
                        <Field>
                          <FieldLabel htmlFor={`recipe-item-ingredient-${index}`}>Insumo</FieldLabel>
                          <Combobox
                            items={ingredientOptions
                              .filter((option) => option.id === item.ingredientId || !usedIds.has(option.id))
                              .map((option) => ({ value: option.id, label: `${option.name} (${UNIT_LABEL[option.unit]})` }))}
                            value={item.ingredientId ? { value: item.ingredientId, label: ingredient ? `${ingredient.name} (${UNIT_LABEL[ingredient.unit]})` : "" } : null}
                            onValueChange={(next) => next && updateItem(index, { ingredientId: next.value })}
                          >
                            <ComboboxInput id={`recipe-item-ingredient-${index}`} placeholder="Buscar insumo..." />
                            <ComboboxContent>
                              <ComboboxEmpty>Nenhum insumo encontrado.</ComboboxEmpty>
                              <ComboboxList>
                                <ComboboxCollection>
                                  {(option: { value: string; label: string }) => (
                                    <ComboboxItem key={option.value} value={option}>
                                      {option.label}
                                    </ComboboxItem>
                                  )}
                                </ComboboxCollection>
                              </ComboboxList>
                            </ComboboxContent>
                          </Combobox>
                        </Field>
                        <Field>
                          <FieldLabel htmlFor={`recipe-item-quantity-${index}`}>
                            Qtd {ingredient ? `(${UNIT_LABEL[ingredient.unit]})` : ""}
                          </FieldLabel>
                          <Input
                            id={`recipe-item-quantity-${index}`}
                            type="number"
                            step="0.001"
                            min="0"
                            value={item.quantity || ""}
                            onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
                          />
                        </Field>
                        <Field>
                          <FieldLabel htmlFor={`recipe-item-waste-${index}`}>Perda %</FieldLabel>
                          <Input
                            id={`recipe-item-waste-${index}`}
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={item.wastePct || ""}
                            onChange={(e) => updateItem(index, { wastePct: Number(e.target.value) })}
                          />
                        </Field>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Remover ingrediente"
                          onClick={() => setItems((current) => current.filter((_, i) => i !== index))}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    )
                  })}
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  disabled={usedIds.size >= ingredientOptions.length}
                  onClick={() => setItems((current) => [...current, { ingredientId: "", quantity: 0, wastePct: 0 }])}
                >
                  <Plus data-icon="inline-start" />
                  Adicionar ingrediente
                </Button>

                <Field>
                  <FieldLabel htmlFor="recipe-notes">Observações</FieldLabel>
                  <Textarea
                    id="recipe-notes"
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Modo de preparo, pontos de atenção..."
                  />
                </Field>
              </>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 border-t p-4">
            {recipe.data ? (
              <Button variant="ghost" className="text-destructive" onClick={() => setConfirmDelete(true)}>
                <Trash2 data-icon="inline-start" />
                Remover ficha
              </Button>
            ) : (
              <span />
            )}
            <Button onClick={handleSave} disabled={!isValid || upsert.isPending}>
              {upsert.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Salvar ficha técnica
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Remover ficha técnica"
        description={`O produto "${productName}" deixará de consumir estoque automaticamente. As movimentações já registradas não são alteradas.`}
        confirmLabel="Remover"
        variant="destructive"
        isLoading={deleteRecipe.isPending}
        onConfirm={() =>
          deleteRecipe.mutate(undefined, {
            onSuccess: () => {
              setConfirmDelete(false)
              onOpenChange(false)
            },
          })
        }
      />
    </>
  )
}
