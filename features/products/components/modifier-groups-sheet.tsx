"use client"

import * as React from "react"
import { Plus, Pencil, Trash2, Layers } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { EmptyState, ErrorState, ConfirmDialog } from "@/components/shared"
import { formatCents } from "@/lib/format"
import { useModifierGroups, useDeleteModifierGroup, useDeleteModifier } from "@/features/products/hooks"
import { ModifierGroupFormDialog } from "./modifier-group-form-dialog"
import { ModifierFormDialog } from "./modifier-form-dialog"
import type { Modifier, ModifierGroup } from "@/features/products/types"

export function ModifierGroupsSheet({
  open,
  onOpenChange,
  productId,
  productName,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  productId: string
  productName: string
}) {
  const { data: groups, isLoading, isError, error, refetch } = useModifierGroups(productId)
  const deleteGroup = useDeleteModifierGroup(productId)
  const deleteModifier = useDeleteModifier(productId)

  const [groupDialog, setGroupDialog] = React.useState<{ open: boolean; group: ModifierGroup | null }>({ open: false, group: null })
  const [modifierDialog, setModifierDialog] = React.useState<{ open: boolean; groupId: string; modifier: Modifier | null }>({
    open: false,
    groupId: "",
    modifier: null,
  })
  const [deleteGroupTarget, setDeleteGroupTarget] = React.useState<ModifierGroup | null>(null)
  const [deleteModifierTarget, setDeleteModifierTarget] = React.useState<{ groupId: string; modifier: Modifier } | null>(null)

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full gap-0 sm:max-w-lg">
          <SheetHeader className="border-b">
            <SheetTitle>Modificadores</SheetTitle>
            <SheetDescription>{productName}</SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            <Button size="sm" variant="outline" onClick={() => setGroupDialog({ open: true, group: null })}>
              <Plus data-icon="inline-start" />
              Novo grupo
            </Button>

            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : isError ? (
              <ErrorState error={error} onRetry={() => refetch()} />
            ) : groups && groups.length > 0 ? (
              groups.map((group) => (
                <div key={group.id} className="rounded-xl border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{group.name}</p>
                        {group.isRequired ? <Badge variant="secondary">Obrigatório</Badge> : null}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Min {group.minSelections} · Máx {group.maxSelections}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => setGroupDialog({ open: true, group })} aria-label="Editar grupo">
                        <Pencil />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => setDeleteGroupTarget(group)} aria-label="Excluir grupo">
                        <Trash2 />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1.5">
                    {group.modifiers.map((modifier) => (
                      <div key={modifier.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-2.5 py-1.5 text-sm">
                        <span>{modifier.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {modifier.priceAdjustment >= 0 ? "+" : ""}
                            {formatCents(modifier.priceAdjustment)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => setModifierDialog({ open: true, groupId: group.id, modifier })}
                            aria-label="Editar modificador"
                          >
                            <Pencil className="size-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => setDeleteModifierTarget({ groupId: group.id, modifier })}
                            aria-label="Excluir modificador"
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-muted-foreground"
                      onClick={() => setModifierDialog({ open: true, groupId: group.id, modifier: null })}
                    >
                      <Plus data-icon="inline-start" />
                      Adicionar modificador
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                icon={Layers}
                title="Nenhum grupo de modificadores"
                description="Crie grupos como 'Tamanho' ou 'Adicionais' para personalizar este produto."
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      <ModifierGroupFormDialog
        open={groupDialog.open}
        onOpenChange={(o) => setGroupDialog((s) => ({ ...s, open: o }))}
        productId={productId}
        group={groupDialog.group}
      />
      <ModifierFormDialog
        open={modifierDialog.open}
        onOpenChange={(o) => setModifierDialog((s) => ({ ...s, open: o }))}
        productId={productId}
        groupId={modifierDialog.groupId}
        modifier={modifierDialog.modifier}
      />

      <ConfirmDialog
        open={!!deleteGroupTarget}
        onOpenChange={(o) => !o && setDeleteGroupTarget(null)}
        title="Excluir grupo de modificadores"
        description={`Tem certeza que deseja excluir "${deleteGroupTarget?.name}"? Todos os modificadores dele também serão removidos.`}
        confirmLabel="Excluir"
        variant="destructive"
        isLoading={deleteGroup.isPending}
        onConfirm={() => {
          if (!deleteGroupTarget) return
          deleteGroup.mutate(deleteGroupTarget.id, { onSuccess: () => setDeleteGroupTarget(null) })
        }}
      />
      <ConfirmDialog
        open={!!deleteModifierTarget}
        onOpenChange={(o) => !o && setDeleteModifierTarget(null)}
        title="Excluir modificador"
        description={`Tem certeza que deseja excluir "${deleteModifierTarget?.modifier.name}"?`}
        confirmLabel="Excluir"
        variant="destructive"
        isLoading={deleteModifier.isPending}
        onConfirm={() => {
          if (!deleteModifierTarget) return
          deleteModifier.mutate(
            { groupId: deleteModifierTarget.groupId, modifierId: deleteModifierTarget.modifier.id },
            { onSuccess: () => setDeleteModifierTarget(null) },
          )
        }}
      />
    </>
  )
}
