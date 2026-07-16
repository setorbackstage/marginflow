"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Plus, ReceiptText, Printer, Store, LayoutGrid, List, Clock, User } from "lucide-react"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"

import { useCan, useActiveStoreId } from "@/features/auth"
import { useOrders, CreateOrderDialog, ORDER_STATUS_CONFIG, ORDER_TYPE_LABEL, ORDER_CHANNEL_LABEL } from "@/features/orders"
import type { OrderChannel, OrderListItem } from "@/features/orders"
import { ordersApi } from "@/features/orders/api"
import { useStoreSettings } from "@/features/stores"
import { PageHeader } from "@/components/app-shell/page-container"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { EmptyState, ErrorState, StatusBadge, PaginationBar, SearchBar, LastUpdated, KanbanColumn, KanbanCard, KanbanBoard } from "@/components/shared"
import { formatCents, formatDateTime, formatRelative } from "@/lib/format"
import { useDebouncedValue, usePrintOrder, useRealtimeSync } from "@/hooks"
import { cn } from "@/lib/utils"

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_FILTER_LABEL: Record<string, string> = {
  ALL: "Todos os status",
  ACTIVE: "Em andamento",
  DELIVERED: "Entregues",
  CANCELLED: "Cancelados",
}
const ACTIVE_STATUSES = "DRAFT,PENDING,CONFIRMED,PREPARING,READY,OUT_FOR_DELIVERY"

const CHANNEL_FILTER_OPTIONS: Record<string, string> = {
  ALL: "Todos os canais",
  ...ORDER_CHANNEL_LABEL,
}

// Kanban columns — only active statuses
const KANBAN_COLUMNS: { status: string; label: string; accent: string }[] = [
  { status: "PENDING",          label: "Novo",        accent: "border-l-orange-400"  },
  { status: "CONFIRMED",        label: "Aceito",       accent: "border-l-blue-400"    },
  { status: "PREPARING",        label: "Preparando",   accent: "border-l-purple-400"  },
  { status: "READY",            label: "Pronto",       accent: "border-l-green-500"   },
  { status: "OUT_FOR_DELIVERY", label: "Saiu",         accent: "border-l-teal-400"    },
]

// Valid drag transitions — only PENDING→CONFIRMED is client-driven.
// PREPARING/READY/OUT_FOR_DELIVERY are system-derived (Kitchen/Delivery own them)
// and cannot be set via the orders/status endpoint.
const VALID_DRAG_TRANSITIONS: Record<string, string> = {
  PENDING: "CONFIRMED",
}

// ─── Kanban card ─────────────────────────────────────────────────────────────

function minutesSince(isoDate: string): number {
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / 60_000)
}

function OrderKanbanCard({ order, onClick }: { order: OrderListItem; onClick: () => void }) {
  const minutesAgo = minutesSince(order.createdAt)
  const isUrgent   = minutesAgo >= 20

  return (
    <KanbanCard
      draggableId={order.id}
      draggableData={{ status: order.status }}
      onClick={onClick}
      className={cn(isUrgent && order.status !== "OUT_FOR_DELIVERY" && "border-amber-400/50")}
    >
      {/* Order number + channel badge */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold">#{order.number}</span>
        {order.channel === "MARKETPLACE" && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-[#ea1d2c]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#ea1d2c] leading-none">
            <Store className="size-2.5" />
            iFood
          </span>
        )}
        {order.channel !== "MARKETPLACE" && (
          <span className="text-[10px] text-muted-foreground">{ORDER_CHANNEL_LABEL[order.channel] ?? order.channel}</span>
        )}
      </div>

      {/* Customer */}
      {order.customerName && (
        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground truncate">
          <User className="size-3 shrink-0" />
          {order.customerName}
        </p>
      )}

      {/* Type + total */}
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{ORDER_TYPE_LABEL[order.type] ?? order.type}</span>
        <span className="text-sm font-medium tabular-nums">{formatCents(order.grandTotal)}</span>
      </div>

      {/* Time elapsed */}
      <p className={cn(
        "mt-1 flex items-center gap-1 text-xs",
        isUrgent ? "font-medium text-amber-500" : "text-muted-foreground",
      )}>
        <Clock className="size-3 shrink-0" />
        {minutesAgo < 1 ? "agora mesmo" : `${minutesAgo} min`}
      </p>
    </KanbanCard>
  )
}

// ─── Kanban view ─────────────────────────────────────────────────────────────

function OrdersKanbanView({ orders, onCardClick }: { orders: OrderListItem[]; onCardClick: (orderId: string) => void }) {
  const storeId    = useActiveStoreId()
  const queryClient = useQueryClient()
  const canUpdate  = useCan("orders:edit")

  const handleCardDrop = React.useCallback(
    async (cardId: string, newColumnId: string) => {
      if (!canUpdate) return
      const order = orders.find((o) => o.id === cardId)
      if (!order) return
      const validNext = VALID_DRAG_TRANSITIONS[order.status]
      if (validNext !== newColumnId) return // only valid transitions allowed

      try {
        await ordersApi.updateStatus(storeId, cardId, newColumnId)
        queryClient.invalidateQueries({ queryKey: ["orders", storeId] })
        queryClient.invalidateQueries({ queryKey: ["kitchen", storeId] })
        queryClient.invalidateQueries({ queryKey: ["dashboard", storeId] })
      } catch {
        toast.error("Não foi possível mover o pedido.")
      }
    },
    [canUpdate, orders, storeId, queryClient],
  )

  return (
    <KanbanBoard
      onCardDrop={handleCardDrop}
      renderOverlay={(id) => {
        const o = orders.find((x) => x.id === id)
        if (!o) return null
        return (
          <KanbanCard className="w-64 shadow-xl">
            <p className="font-semibold">#{o.number}</p>
            <p className="text-xs text-muted-foreground">{formatCents(o.grandTotal)}</p>
          </KanbanCard>
        )
      }}
    >
      <div className="flex gap-4 overflow-x-auto pb-2">
        {KANBAN_COLUMNS.map((col) => {
          const colOrders = orders.filter((o) => o.status === col.status)
          return (
            <KanbanColumn
              key={col.status}
              title={col.label}
              count={colOrders.length}
              droppableId={col.status}
              accentColor={col.accent}
            >
              {colOrders.map((order) => (
                <OrderKanbanCard
                  key={order.id}
                  order={order}
                  onClick={() => onCardClick(order.id)}
                />
              ))}
              {colOrders.length === 0 && (
                <p className="px-1 py-8 text-center text-xs text-muted-foreground">Vazio</p>
              )}
            </KanbanColumn>
          )
        })}
      </div>
    </KanbanBoard>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const router    = useRouter()
  const canCreate = useCan("orders:create")
  const storeId   = useActiveStoreId()
  useRealtimeSync({ table: "orders", storeId, queryKeys: [["orders", storeId]] })

  const [view, setView]               = React.useState<"table" | "kanban">("table")
  const [searchInput, setSearchInput] = React.useState("")
  const search                        = useDebouncedValue(searchInput)
  const [statusFilter, setStatusFilter] = React.useState<"ALL" | "ACTIVE" | "DELIVERED" | "CANCELLED">("ACTIVE")
  const [channelFilter, setChannelFilter] = React.useState<"ALL" | OrderChannel>("ALL")
  const [page, setPage]               = React.useState(1)
  const [createOpen, setCreateOpen]   = React.useState(false)
  const [createKey, setCreateKey]     = React.useState(0)

  const openCreateDialog = () => {
    setCreateKey((k) => k + 1)
    setCreateOpen(true)
  }

  const statusParam  = statusFilter === "ALL" ? undefined : statusFilter === "ACTIVE" ? ACTIVE_STATUSES : statusFilter
  const channelParam = channelFilter === "ALL" ? undefined : channelFilter

  // Kanban always fetches active orders up to 100 (no pagination in kanban)
  const kanbanOrders = useOrders({ status: ACTIVE_STATUSES, page: 1 })
  const tableOrders  = useOrders({ page, search: search || undefined, status: statusParam, channel: channelParam })
  const orders       = view === "kanban" ? kanbanOrders : tableOrders

  const { printOrderById, printOrderByIdAuto } = usePrintOrder()
  const settings = useStoreSettings()

  // Auto-print when a new order appears in the active list
  const seenOrderIdsRef = React.useRef<Set<string> | null>(null)
  const shouldAutoPrint = settings.data?.printReceiptOnConfirm || settings.data?.printKitchenTicketOnConfirm
  React.useEffect(() => {
    if (!orders.data || !shouldAutoPrint) return
    if (statusFilter !== "ACTIVE" && view !== "kanban") return

    const currentIds = new Set(orders.data.items.map((o) => o.id))
    if (seenOrderIdsRef.current === null) {
      seenOrderIdsRef.current = currentIds
      return
    }
    for (const order of orders.data.items) {
      if (!seenOrderIdsRef.current.has(order.id)) {
        printOrderByIdAuto(order.id)
      }
    }
    seenOrderIdsRef.current = currentIds
  }, [orders.data, shouldAutoPrint, statusFilter, view, printOrderByIdAuto])

  const handleStatusFilterChange = (value: typeof statusFilter | null) => {
    if (!value) return
    setStatusFilter(value)
    setPage(1)
  }
  const handleChannelFilterChange = (value: string | null) => {
    if (!value) return
    setChannelFilter(value as typeof channelFilter)
    setPage(1)
  }
  const handleSearchChange = (value: string) => {
    setSearchInput(value)
    setPage(1)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pedidos"
        description="Acompanhe e gerencie os pedidos da loja."
        actions={
          <>
            <LastUpdated dataUpdatedAt={orders.dataUpdatedAt} isFetching={orders.isFetching} />
            {canCreate ? (
              <Button size="sm" onClick={() => openCreateDialog()}>
                <Plus data-icon="inline-start" />
                Novo pedido
              </Button>
            ) : null}
          </>
        }
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* View toggle */}
        <div className="flex rounded-lg border p-0.5">
          <Button
            size="sm"
            variant={view === "table" ? "secondary" : "ghost"}
            className="h-7 px-2"
            onClick={() => setView("table")}
            aria-label="Vista em tabela"
          >
            <List className="size-4" />
          </Button>
          <Button
            size="sm"
            variant={view === "kanban" ? "secondary" : "ghost"}
            className="h-7 px-2"
            onClick={() => setView("kanban")}
            aria-label="Vista em kanban"
          >
            <LayoutGrid className="size-4" />
          </Button>
        </div>

        {view === "table" && (
          <>
            <SearchBar value={searchInput} onChange={handleSearchChange} placeholder="Buscar por número ou cliente..." />
            <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_FILTER_LABEL).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={channelFilter} onValueChange={handleChannelFilterChange}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CHANNEL_FILTER_OPTIONS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
      </div>

      {/* Kanban view */}
      {view === "kanban" ? (
        kanbanOrders.isLoading ? (
          <div className="flex gap-4">
            {KANBAN_COLUMNS.map((c) => <Skeleton key={c.status} className="h-64 min-w-72" />)}
          </div>
        ) : kanbanOrders.isError ? (
          <ErrorState error={kanbanOrders.error} onRetry={() => kanbanOrders.refetch()} />
        ) : (
          <OrdersKanbanView
            orders={kanbanOrders.data?.items ?? []}
            onCardClick={(id) => router.push(`/orders/${id}`)}
          />
        )
      ) : (
        /* Table view */
        tableOrders.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : tableOrders.isError ? (
          <ErrorState error={tableOrders.error} onRetry={() => tableOrders.refetch()} />
        ) : tableOrders.data && tableOrders.data.items.length > 0 ? (
          <>
            <div className="rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableOrders.data.items.map((order) => (
                    <TableRow key={order.id} className="cursor-pointer" onClick={() => router.push(`/orders/${order.id}`)}>
                      <TableCell className="font-medium">
                        <span className="flex items-center gap-1.5">
                          #{order.number}
                          {order.channel === "MARKETPLACE" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#ea1d2c]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#ea1d2c] leading-none">
                              <Store className="size-2.5" />
                              iFood
                            </span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{order.customerName ?? "Cliente avulso"}</TableCell>
                      <TableCell>{ORDER_TYPE_LABEL[order.type]}</TableCell>
                      <TableCell>
                        <StatusBadge status={order.status} config={ORDER_STATUS_CONFIG} />
                      </TableCell>
                      <TableCell className="tabular-nums">{formatCents(order.grandTotal)}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDateTime(order.createdAt)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Reimprimir pedido"
                          onClick={(e) => {
                            e.stopPropagation()
                            printOrderById(order.id)
                          }}
                        >
                          <Printer />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <PaginationBar pagination={tableOrders.data.pagination} onPageChange={setPage} />
          </>
        ) : (
          <EmptyState
            icon={ReceiptText}
            title={search ? `Nenhum pedido para "${search}"` : statusFilter !== "ACTIVE" ? "Nenhum pedido neste filtro" : "Você ainda não tem pedidos aqui"}
            description={
              search
                ? "Tente buscar pelo número do pedido ou pelo nome do cliente."
                : statusFilter !== "ACTIVE"
                  ? "Tente mudar o filtro de status para ver outros pedidos."
                  : "Comece criando um novo pedido — balcão, delivery ou retirada."
            }
            action={
              canCreate && !search ? (
                <Button size="sm" onClick={() => openCreateDialog()}>
                  <Plus data-icon="inline-start" />
                  Novo pedido
                </Button>
              ) : undefined
            }
          />
        )
      )}

      <CreateOrderDialog key={createKey} open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
