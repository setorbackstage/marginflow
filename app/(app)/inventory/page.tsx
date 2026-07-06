"use client"

import * as React from "react"
import { Plus, Boxes, MoreHorizontal, Pencil, Trash2, ArrowLeftRight, TriangleAlert } from "lucide-react"

import { useCan } from "@/features/auth"
import {
  useIngredients,
  useMovements,
  useStockAlerts,
  useDeleteIngredient,
  IngredientFormDialog,
  MovementFormDialog,
  INGREDIENT_STATUS_CONFIG,
  MOVEMENT_TYPE_CONFIG,
  ALERT_SEVERITY_CONFIG,
  formatQuantity,
  formatUnitCost,
} from "@/features/inventory"
import type { Ingredient, MovementType } from "@/features/inventory/types"
import { PageHeader } from "@/components/app-shell/page-container"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { EmptyState, ErrorState, StatusBadge, PaginationBar, SearchBar, ConfirmDialog } from "@/components/shared"
import { formatDateTime } from "@/lib/format"
import { useDebouncedValue } from "@/hooks"
import { cn } from "@/lib/utils"

const MOVEMENT_FILTER_LABEL: Record<string, string> = {
  ALL: "Todos os tipos",
  ENTRY: "Entradas",
  EXIT: "Saídas",
  ADJUSTMENT: "Ajustes",
  LOSS: "Perdas",
  SALE_CONSUMPTION: "Consumo (venda)",
  SALE_REVERSAL: "Estornos",
}

function IngredientsTab({
  canManage,
  canAdjust,
  onNewMovement,
}: {
  canManage: boolean
  canAdjust: boolean
  onNewMovement: (ingredientId: string) => void
}) {
  const [searchInput, setSearchInput] = React.useState("")
  const search = useDebouncedValue(searchInput)
  const [lowStockOnly, setLowStockOnly] = React.useState(false)
  const [page, setPage] = React.useState(1)

  const ingredients = useIngredients({ page, search: search || undefined, lowStock: lowStockOnly || undefined })
  const deleteIngredient = useDeleteIngredient()

  const [formDialog, setFormDialog] = React.useState<{ open: boolean; ingredient: Ingredient | null }>({ open: false, ingredient: null })
  const [deleteTarget, setDeleteTarget] = React.useState<Ingredient | null>(null)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <SearchBar
          value={searchInput}
          onChange={(value) => {
            setSearchInput(value)
            setPage(1)
          }}
          placeholder="Buscar insumo por nome..."
        />
        <Button
          variant={lowStockOnly ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setLowStockOnly((v) => !v)
            setPage(1)
          }}
        >
          <TriangleAlert data-icon="inline-start" />
          Estoque baixo
        </Button>
        {canManage ? (
          <Button size="sm" className="ml-auto" onClick={() => setFormDialog({ open: true, ingredient: null })}>
            <Plus data-icon="inline-start" />
            Novo insumo
          </Button>
        ) : null}
      </div>

      {ingredients.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : ingredients.isError ? (
        <ErrorState error={ingredients.error} onRetry={() => ingredients.refetch()} />
      ) : ingredients.data && ingredients.data.items.length > 0 ? (
        <>
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Insumo</TableHead>
                  <TableHead>Saldo</TableHead>
                  <TableHead>Mínimo</TableHead>
                  <TableHead>Custo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {ingredients.data.items.map((ingredient) => (
                  <TableRow key={ingredient.id}>
                    <TableCell className="font-medium">{ingredient.name}</TableCell>
                    <TableCell
                      className={cn(
                        "tabular-nums",
                        ingredient.currentStock < 0 && "font-semibold text-destructive",
                        ingredient.isLowStock && ingredient.currentStock >= 0 && "font-medium text-amber-600 dark:text-amber-500",
                      )}
                    >
                      {formatQuantity(ingredient.currentStock, ingredient.unit)}
                      {ingredient.isLowStock ? <TriangleAlert className="ml-1.5 inline size-3.5 align-[-2px]" /> : null}
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {ingredient.minStock !== null ? formatQuantity(ingredient.minStock, ingredient.unit) : "—"}
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {formatUnitCost(ingredient.costPerUnit, ingredient.unit)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={ingredient.status} config={INGREDIENT_STATUS_CONFIG} />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Ações do insumo" />}>
                          <MoreHorizontal />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          {canAdjust ? (
                            <DropdownMenuItem onClick={() => onNewMovement(ingredient.id)}>
                              <ArrowLeftRight data-icon="inline-start" />
                              Movimentar
                            </DropdownMenuItem>
                          ) : null}
                          {canManage ? (
                            <>
                              <DropdownMenuItem onClick={() => setFormDialog({ open: true, ingredient })}>
                                <Pencil data-icon="inline-start" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(ingredient)}>
                                <Trash2 data-icon="inline-start" />
                                Excluir
                              </DropdownMenuItem>
                            </>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <PaginationBar pagination={ingredients.data.pagination} onPageChange={setPage} />
        </>
      ) : (
        <EmptyState
          icon={Boxes}
          title="Nenhum insumo encontrado"
          description={
            search || lowStockOnly ? "Ajuste os filtros ou a busca." : "Cadastre os insumos que a sua cozinha consome."
          }
          action={
            canManage && !search && !lowStockOnly ? (
              <Button size="sm" onClick={() => setFormDialog({ open: true, ingredient: null })}>
                <Plus data-icon="inline-start" />
                Novo insumo
              </Button>
            ) : undefined
          }
        />
      )}

      <IngredientFormDialog
        open={formDialog.open}
        onOpenChange={(open) => setFormDialog((s) => ({ ...s, open }))}
        ingredient={formDialog.ingredient}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Excluir insumo"
        description={`Tem certeza que deseja excluir "${deleteTarget?.name}"? O histórico de movimentações é preservado.`}
        confirmLabel="Excluir"
        variant="destructive"
        isLoading={deleteIngredient.isPending}
        onConfirm={() => {
          if (!deleteTarget) return
          deleteIngredient.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
        }}
      />
    </div>
  )
}

function MovementsTab({ canAdjust, onNewMovement }: { canAdjust: boolean; onNewMovement: () => void }) {
  const [typeFilter, setTypeFilter] = React.useState<"ALL" | MovementType>("ALL")
  const [page, setPage] = React.useState(1)

  const movements = useMovements({ page, type: typeFilter === "ALL" ? undefined : typeFilter })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={typeFilter}
          onValueChange={(value) => {
            if (!value) return
            setTypeFilter(value as typeof typeFilter)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-52">
            <SelectValue>{(v: string | null) => MOVEMENT_FILTER_LABEL[v ?? "ALL"]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(MOVEMENT_FILTER_LABEL).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {canAdjust ? (
          <Button size="sm" className="ml-auto" onClick={onNewMovement}>
            <Plus data-icon="inline-start" />
            Nova movimentação
          </Button>
        ) : null}
      </div>

      {movements.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : movements.isError ? (
        <ErrorState error={movements.error} onRetry={() => movements.refetch()} />
      ) : movements.data && movements.data.items.length > 0 ? (
        <>
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Insumo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Quando</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.data.items.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell className="font-medium">{movement.ingredientName}</TableCell>
                    <TableCell>
                      <StatusBadge status={movement.type} config={MOVEMENT_TYPE_CONFIG} />
                    </TableCell>
                    <TableCell
                      className={cn(
                        "tabular-nums",
                        movement.quantityDelta > 0 ? "text-emerald-600 dark:text-emerald-500" : "text-muted-foreground",
                      )}
                    >
                      {movement.quantityDelta > 0 ? "+" : ""}
                      {formatQuantity(movement.quantityDelta, movement.ingredientUnit)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {movement.orderNumber !== null
                        ? `Pedido #${movement.orderNumber}`
                        : movement.createdByUserName ?? "—"}
                      {movement.reason ? (
                        <span className="block max-w-56 truncate text-xs" title={movement.reason}>
                          {movement.reason}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTime(movement.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <PaginationBar pagination={movements.data.pagination} onPageChange={setPage} />
        </>
      ) : (
        <EmptyState
          icon={ArrowLeftRight}
          title="Nenhuma movimentação registrada"
          description={
            typeFilter !== "ALL"
              ? "Ajuste o filtro de tipo."
              : "Entradas, saídas, ajustes e o consumo automático dos pedidos aparecem aqui."
          }
          action={
            canAdjust && typeFilter === "ALL" ? (
              <Button size="sm" onClick={onNewMovement}>
                <Plus data-icon="inline-start" />
                Nova movimentação
              </Button>
            ) : undefined
          }
        />
      )}
    </div>
  )
}

function AlertsTab() {
  const alerts = useStockAlerts()

  return alerts.isLoading ? (
    <div className="space-y-2">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  ) : alerts.isError ? (
    <ErrorState error={alerts.error} onRetry={() => alerts.refetch()} />
  ) : alerts.data && alerts.data.length > 0 ? (
    <div className="rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Insumo</TableHead>
            <TableHead>Severidade</TableHead>
            <TableHead>Saldo atual</TableHead>
            <TableHead>Mínimo configurado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {alerts.data.map((alert) => (
            <TableRow key={alert.ingredientId}>
              <TableCell className="font-medium">{alert.ingredientName}</TableCell>
              <TableCell>
                <StatusBadge status={alert.severity} config={ALERT_SEVERITY_CONFIG} />
              </TableCell>
              <TableCell
                className={cn("tabular-nums", alert.currentStock < 0 ? "font-semibold text-destructive" : "font-medium")}
              >
                {formatQuantity(alert.currentStock, alert.unit)}
              </TableCell>
              <TableCell className="tabular-nums text-muted-foreground">
                {formatQuantity(alert.minStock, alert.unit)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  ) : (
    <EmptyState
      icon={TriangleAlert}
      title="Nenhum alerta ativo"
      description="Todos os insumos com mínimo configurado estão acima do limite."
    />
  )
}

export default function InventoryPage() {
  const canManage = useCan("inventory:manage")
  const canAdjust = useCan("inventory:adjust")

  const [movementDialog, setMovementDialog] = React.useState<{ open: boolean; ingredientId?: string }>({ open: false })
  const alerts = useStockAlerts()
  // Full (unpaginated-enough) list for the movement dialog's ingredient select.
  const allIngredients = useIngredients({ page: 1 })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Estoque"
        description="Insumos, saldos, movimentações e alertas de estoque baixo."
      />

      <Tabs defaultValue="ingredients">
        <TabsList>
          <TabsTrigger value="ingredients">Insumos</TabsTrigger>
          <TabsTrigger value="movements">Movimentações</TabsTrigger>
          <TabsTrigger value="alerts">
            Alertas
            {alerts.data && alerts.data.length > 0 ? (
              <Badge variant="destructive" className="ml-1.5 px-1.5 text-[0.7rem]">
                {alerts.data.length}
              </Badge>
            ) : null}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="ingredients" className="mt-4">
          <IngredientsTab
            canManage={canManage}
            canAdjust={canAdjust}
            onNewMovement={(ingredientId) => setMovementDialog({ open: true, ingredientId })}
          />
        </TabsContent>
        <TabsContent value="movements" className="mt-4">
          <MovementsTab canAdjust={canAdjust} onNewMovement={() => setMovementDialog({ open: true })} />
        </TabsContent>
        <TabsContent value="alerts" className="mt-4">
          <AlertsTab />
        </TabsContent>
      </Tabs>

      <MovementFormDialog
        open={movementDialog.open}
        onOpenChange={(open) => setMovementDialog((s) => ({ ...s, open }))}
        ingredients={allIngredients.data?.items ?? []}
        defaultIngredientId={movementDialog.ingredientId}
      />
    </div>
  )
}
