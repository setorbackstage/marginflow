"use client"

import * as React from "react"
import { Plus, Boxes, MoreHorizontal, Pencil, Trash2, ArrowLeftRight, TriangleAlert, FileScan } from "lucide-react"

import { useCan } from "@/features/auth"
import {
  useIngredients,
  useMovements,
  useStockAlerts,
  useInventoryInsights,
  useDeleteIngredient,
  useInventoryValue,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { EmptyState, ErrorState, StatusBadge, PaginationBar, SearchBar, ConfirmDialog, LastUpdated } from "@/components/shared"
import { formatCents, formatDateTime } from "@/lib/format"
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
  const inventoryValue = useInventoryValue()
  const deleteIngredient = useDeleteIngredient()

  const [formDialog, setFormDialog] = React.useState<{ open: boolean; ingredient: Ingredient | null }>({ open: false, ingredient: null })
  const [deleteTarget, setDeleteTarget] = React.useState<Ingredient | null>(null)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Valor em estoque</CardTitle>
        </CardHeader>
        <CardContent>
          {inventoryValue.isLoading ? (
            <Skeleton className="h-8 w-32" />
          ) : inventoryValue.isError ? (
            <span className="text-sm text-destructive">Erro ao carregar</span>
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold tabular-nums">{formatCents(inventoryValue.data?.total ?? 0)}</span>
              {inventoryValue.data?.isApproximate ? (
                <span className="text-xs text-muted-foreground">(aproximado, mais de 100 insumos ativos)</span>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

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
          <Button size="sm" variant="outline" className="ml-auto" disabled>
            <FileScan data-icon="inline-start" />
            Importar Nota Fiscal
            <Badge variant="secondary" className="ml-1">
              Em breve
            </Badge>
          </Button>
        ) : null}
        {canManage ? (
          <Button size="sm" onClick={() => setFormDialog({ open: true, ingredient: null })}>
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
                  <TableHead>Categoria</TableHead>
                  <TableHead>Saldo</TableHead>
                  <TableHead>Mínimo</TableHead>
                  <TableHead>Custo</TableHead>
                  <TableHead>Valor em estoque</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {ingredients.data.items.map((ingredient) => (
                  <TableRow key={ingredient.id}>
                    <TableCell className="font-medium">{ingredient.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {ingredient.category ? <Badge variant="secondary">{ingredient.category}</Badge> : "—"}
                    </TableCell>
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
                    <TableCell className="tabular-nums text-muted-foreground">
                      {formatCents(Math.max(0, ingredient.currentStock) * ingredient.costPerUnit)}
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
          title={search ? `Nenhum insumo para "${search}"` : lowStockOnly ? "Nenhum insumo com estoque baixo" : "Você ainda não tem insumos cadastrados"}
          description={
            search
              ? "Tente buscar por outro nome de insumo."
              : lowStockOnly
                ? "Ótimo! Todos os insumos com mínimo configurado estão acima do limite."
                : "Cadastre os insumos que a sua cozinha consome para controlar custos e estoque automaticamente."
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
          items={MOVEMENT_FILTER_LABEL}
        >
          <SelectTrigger className="w-52">
            <SelectValue />
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
          title={typeFilter !== "ALL" ? "Nenhuma movimentação neste filtro" : "Ainda não há movimentações registradas"}
          description={
            typeFilter !== "ALL"
              ? "Tente remover o filtro para ver todo o histórico."
              : "Entradas de compra, saídas, ajustes manuais e o consumo automático dos pedidos aparecem aqui."
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
  const insights = useInventoryInsights()

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 text-sm font-medium">Estoque crítico</h3>
        {alerts.isLoading ? (
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
            title="Nenhum alerta no momento"
            description="Tudo certo! Todos os insumos com estoque mínimo configurado estão dentro do limite."
          />
        )}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium">Produtos parados</h3>
        <p className="mb-2 text-xs text-muted-foreground">Insumos ativos sem nenhuma movimentação nos últimos 30 dias.</p>
        {insights.isLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : insights.data && insights.data.stale.length > 0 ? (
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Insumo</TableHead>
                  <TableHead>Saldo atual</TableHead>
                  <TableHead>Última movimentação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {insights.data.stale.map((item) => (
                  <TableRow key={item.ingredientId}>
                    <TableCell className="font-medium">{item.ingredientName}</TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">{formatQuantity(item.currentStock, item.unit)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.daysSinceLastMovement === null ? "Nunca movimentado" : `Há ${item.daysSinceLastMovement} dias`}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Ótimo! Todos os insumos tiveram movimentação nos últimos 30 dias.</p>
        )}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-medium">Maior consumo (30 dias)</h3>
          {insights.isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : insights.data && insights.data.topByQuantity.length > 0 ? (
            <div className="divide-y rounded-xl border">
              {insights.data.topByQuantity.map((item) => (
                <div key={item.ingredientId} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="font-medium">{item.ingredientName}</span>
                  <span className="tabular-nums text-muted-foreground">{formatQuantity(item.totalConsumed, item.unit)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum consumo registrado nos últimos 30 dias.</p>
          )}
        </div>
        <div>
          <h3 className="mb-2 text-sm font-medium">Maior custo (30 dias)</h3>
          {insights.isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : insights.data && insights.data.topByCost.length > 0 ? (
            <div className="divide-y rounded-xl border">
              {insights.data.topByCost.map((item) => (
                <div key={item.ingredientId} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="font-medium">{item.ingredientName}</span>
                  <span className="tabular-nums text-muted-foreground">{formatCents(item.totalCost)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum custo de consumo registrado nos últimos 30 dias.</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function InventoryPage() {
  const canManage = useCan("inventory:manage")
  const canAdjust = useCan("inventory:adjust")

  const [movementDialog, setMovementDialog] = React.useState<{ open: boolean; ingredientId?: string }>({ open: false })
  const alerts = useStockAlerts()
  // Full (unpaginated-enough) list for the movement dialog's ingredient select.
  const allIngredients = useIngredients({ page: 1, perPage: 100 })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Estoque"
        description="Insumos, saldos, movimentações e alertas de estoque baixo."
        actions={
          <LastUpdated dataUpdatedAt={allIngredients.dataUpdatedAt} isFetching={allIngredients.isFetching} />
        }
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
