"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Plus, ReceiptText, Printer } from "lucide-react"

import { useCan } from "@/features/auth"
import { useOrders, CreateOrderDialog, ORDER_STATUS_CONFIG, ORDER_TYPE_LABEL } from "@/features/orders"
import { useStoreSettings } from "@/features/stores"
import { PageHeader } from "@/components/app-shell/page-container"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { EmptyState, ErrorState, StatusBadge, PaginationBar, SearchBar } from "@/components/shared"
import { formatCents, formatDateTime } from "@/lib/format"
import { useDebouncedValue, usePrintOrder } from "@/hooks"

const STATUS_FILTER_LABEL: Record<string, string> = {
  ALL: "Todos os status",
  ACTIVE: "Em andamento",
  DELIVERED: "Entregues",
  CANCELLED: "Cancelados",
}
const ACTIVE_STATUSES = "DRAFT,PENDING,CONFIRMED,PREPARING,READY,OUT_FOR_DELIVERY"

export default function OrdersPage() {
  const router = useRouter()
  const canCreate = useCan("orders:create")

  const [searchInput, setSearchInput] = React.useState("")
  const search = useDebouncedValue(searchInput)
  const [statusFilter, setStatusFilter] = React.useState<"ALL" | "ACTIVE" | "DELIVERED" | "CANCELLED">("ACTIVE")
  const [page, setPage] = React.useState(1)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [createKey, setCreateKey] = React.useState(0)
  const openCreateDialog = () => {
    setCreateKey((k) => k + 1)
    setCreateOpen(true)
  }

  const statusParam = statusFilter === "ALL" ? undefined : statusFilter === "ACTIVE" ? ACTIVE_STATUSES : statusFilter
  const orders = useOrders({ page, search: search || undefined, status: statusParam })
  const { printOrderById } = usePrintOrder()
  const settings = useStoreSettings()

  // Auto-print when a new order appears in the active list
  const seenOrderIdsRef = React.useRef<Set<string> | null>(null)
  React.useEffect(() => {
    if (!orders.data || !settings.data?.printReceiptOnConfirm) return
    if (statusFilter !== "ACTIVE") return

    const currentIds = new Set(orders.data.items.map((o) => o.id))

    if (seenOrderIdsRef.current === null) {
      // First load — just record existing orders, don't auto-print them
      seenOrderIdsRef.current = currentIds
      return
    }

    for (const order of orders.data.items) {
      if (!seenOrderIdsRef.current.has(order.id)) {
        printOrderById(order.id)
      }
    }

    seenOrderIdsRef.current = currentIds
  }, [orders.data, settings.data?.printReceiptOnConfirm, statusFilter, printOrderById])

  const handleFilterChange = (value: typeof statusFilter | null) => {
    if (!value) return
    setStatusFilter(value)
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
          canCreate ? (
            <Button size="sm" onClick={() => openCreateDialog()}>
              <Plus data-icon="inline-start" />
              Novo pedido
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <SearchBar value={searchInput} onChange={handleSearchChange} placeholder="Buscar por número ou cliente..." />
        <Select value={statusFilter} onValueChange={handleFilterChange}>
          <SelectTrigger className="w-48">
            <SelectValue>{(v: string | null) => STATUS_FILTER_LABEL[v ?? "ALL"]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(STATUS_FILTER_LABEL).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {orders.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : orders.isError ? (
        <ErrorState error={orders.error} onRetry={() => orders.refetch()} />
      ) : orders.data && orders.data.items.length > 0 ? (
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
                {orders.data.items.map((order) => (
                  <TableRow key={order.id} className="cursor-pointer" onClick={() => router.push(`/orders/${order.id}`)}>
                    <TableCell className="font-medium">#{order.number}</TableCell>
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
          <PaginationBar pagination={orders.data.pagination} onPageChange={setPage} />
        </>
      ) : (
        <EmptyState
          icon={ReceiptText}
          title="Nenhum pedido encontrado"
          description={search || statusFilter !== "ACTIVE" ? "Ajuste os filtros ou a busca." : "Comece criando o primeiro pedido."}
          action={
            canCreate && !search ? (
              <Button size="sm" onClick={() => openCreateDialog()}>
                <Plus data-icon="inline-start" />
                Novo pedido
              </Button>
            ) : undefined
          }
        />
      )}

      <CreateOrderDialog key={createKey} open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
