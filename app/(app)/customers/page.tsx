"use client"

import * as React from "react"
import { Plus, Users, MoreHorizontal, Eye, Pencil, Download, UserCheck, TrendingUp, AlertTriangle, Star, WhatsApp } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

import { useCan, useActiveStoreId } from "@/features/auth"
import {
  useCustomers,
  useCustomerSegments,
  CustomerFormDialog,
  CustomerDetailSheet,
  CUSTOMER_STATUS_CONFIG,
} from "@/features/customers"
import { customersApi } from "@/features/customers/api"
import type { CustomerDetail, CustomerListItem, CustomerStatus } from "@/features/customers/types"
import { useCustomer } from "@/features/customers/hooks"
import { PageHeader } from "@/components/app-shell/page-container"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { EmptyState, ErrorState, StatusBadge, PaginationBar, SearchBar } from "@/components/shared"
import { formatCents, formatDate } from "@/lib/format"
import { useDebouncedValue } from "@/hooks"
import { cn } from "@/lib/utils"

const STATUS_FILTER_LABEL: Record<string, string> = {
  ALL: "Todos os status", ACTIVE: "Ativos", BLOCKED: "Bloqueados",
}

// ─── CRM Segment card ─────────────────────────────────────────────────────────

function SegmentCard({
  label, value, icon: Icon, className, accent,
}: {
  label: string
  value: number | undefined
  icon: React.ElementType
  className?: string
  accent?: "risk" | "new" | "frequent"
}) {
  const accentClass = accent === "risk"
    ? "bg-red-500/10 text-red-600 dark:text-red-400"
    : accent === "new"
      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      : accent === "frequent"
        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
        : "bg-muted text-muted-foreground"
  return (
    <div className={cn("flex items-center gap-3 rounded-xl border bg-card p-3", className)}>
      <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", accentClass)}>
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold tabular-nums leading-tight">{value ?? "—"}</p>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CustomersPage() {
  const router    = useRouter()
  const storeId   = useActiveStoreId()
  const canCreate = useCan("customers:create")
  const canEdit   = useCan("customers:edit")
  const canExport = useCan("crm:export")

  const [searchInput, setSearchInput] = React.useState("")
  const search = useDebouncedValue(searchInput)
  const [statusFilter, setStatusFilter] = React.useState<CustomerStatus | "ALL">("ALL")
  const [page, setPage]       = React.useState(1)
  const [exporting, setExporting] = React.useState(false)

  const customers = useCustomers({ page, search: search || undefined, status: statusFilter === "ALL" ? undefined : statusFilter })
  const segments  = useCustomerSegments()

  const [formDialog, setFormDialog] = React.useState<{ open: boolean; customer: CustomerDetail | null }>({ open: false, customer: null })
  const [detailId, setDetailId]     = React.useState<string | null>(null)
  const detail = useCustomer(detailId ?? undefined)

  const handleFilterChange = (value: CustomerStatus | "ALL" | null) => {
    if (!value) return
    setStatusFilter(value)
    setPage(1)
  }
  const handleSearchChange = (value: string) => {
    setSearchInput(value)
    setPage(1)
  }

  const handleExportCsv = async () => {
    if (!canExport) return
    setExporting(true)
    try {
      const data = await customersApi.list(storeId, {
        limit:  2000,
        status: statusFilter === "ALL" ? undefined : statusFilter,
        search: search || undefined,
      })
      const header = ["Nome", "Telefone", "E-mail", "Status", "Pedidos", "Total gasto (R$)", "Último pedido", "Cliente desde"]
      const rows = data.items.map((c) => [
        c.name,
        c.phone,
        c.email ?? "",
        c.status === "ACTIVE" ? "Ativo" : "Bloqueado",
        String(c.totalOrders),
        (c.totalSpent / 100).toFixed(2).replace(".", ","),
        c.lastOrderAt ? formatDate(c.lastOrderAt) : "",
        formatDate(c.createdAt),
      ])
      const csv = [header, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
        .join("\n")
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
      const url  = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href     = url
      link.download = `clientes-${new Date().toISOString().slice(0, 10)}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error("Erro ao exportar clientes.")
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Clientes"
        description="Gerencie e acompanhe o relacionamento com os seus clientes."
        actions={
          <div className="flex items-center gap-2">
            {canExport && (
              <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={exporting}>
                <Download data-icon="inline-start" />
                {exporting ? "Exportando…" : "Exportar CSV"}
              </Button>
            )}
            {canCreate && (
              <Button size="sm" onClick={() => setFormDialog({ open: true, customer: null })}>
                <Plus data-icon="inline-start" />
                Novo cliente
              </Button>
            )}
          </div>
        }
      />

      {/* CRM Segments bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <SegmentCard label="Total"        value={segments.data?.total}      icon={Users}         />
        <SegmentCard label="Ativos"       value={segments.data?.active}     icon={UserCheck}     />
        <SegmentCard label="Novos (30d)"  value={segments.data?.newLast30}  icon={TrendingUp}    accent="new" />
        <SegmentCard label="Frequentes"   value={segments.data?.frequent}   icon={Star}          accent="frequent" />
        <SegmentCard label="Em risco"     value={segments.data?.atRisk}     icon={AlertTriangle} accent="risk" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchBar value={searchInput} onChange={handleSearchChange} placeholder="Buscar por nome ou telefone..." />
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          <Select value={statusFilter} onValueChange={handleFilterChange}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
          <SelectContent>
            {Object.entries(STATUS_FILTER_LABEL).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {customers.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : customers.isError ? (
        <ErrorState error={customers.error} onRetry={() => customers.refetch()} />
      ) : customers.data && customers.data.items.length > 0 ? (
        <>
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Cliente</TableHead>
                  <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Telefone</TableHead>
                  <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</TableHead>
                  <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Pedidos</TableHead>
                  <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Total gasto</TableHead>
                  <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Último pedido</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.data.items.map((customer: CustomerListItem) => (
                  <TableRow
                    key={customer.id}
                    className="group cursor-pointer"
                    onClick={() => router.push(`/customers/${customer.id}`)}
                  >
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      <a
                        href={`https://wa.me/${customer.phone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 hover:text-emerald-500"
                      >
                        <WhatsApp className="size-3.5" />
                        {customer.phone}
                      </a>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={customer.status} config={CUSTOMER_STATUS_CONFIG} />
                    </TableCell>
                    <TableCell className="tabular-nums">{customer.totalOrders}</TableCell>
                    <TableCell className="tabular-nums">{formatCents(customer.totalSpent)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(customer.lastOrderAt)}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end opacity-0 transition-opacity group-hover:opacity-100">
                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Ações do cliente" />}>
                            <MoreHorizontal />
                          </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => router.push(`/customers/${customer.id}`)}>
                            <Eye data-icon="inline-start" />
                            Ver perfil
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setDetailId(customer.id) }}>
                            <Eye data-icon="inline-start" />
                            Pré-visualizar
                          </DropdownMenuItem>
                          {canEdit ? (
                            <DropdownMenuItem
                              onClick={(e) => { e.stopPropagation(); setFormDialog({ open: true, customer: customer as unknown as CustomerDetail }) }}
                            >
                              <Pencil data-icon="inline-start" />
                              Editar
                            </DropdownMenuItem>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <PaginationBar pagination={customers.data.pagination} onPageChange={setPage} />
        </>
      ) : (
        <EmptyState
          icon={Users}
          title={search ? `Nenhum cliente para "${search}"` : statusFilter !== "ALL" ? "Nenhum cliente neste filtro" : "Você ainda não tem clientes cadastrados"}
          description={
            search
              ? "Tente buscar pelo nome completo ou pelo número de telefone."
              : statusFilter !== "ALL"
                ? "Tente remover o filtro de status para ver todos os clientes."
                : "Cadastre seu primeiro cliente para acompanhar pedidos, endereços e histórico de compras."
          }
          action={
            canCreate && !search && statusFilter === "ALL" ? (
              <Button size="sm" onClick={() => setFormDialog({ open: true, customer: null })}>
                <Plus data-icon="inline-start" />
                Novo cliente
              </Button>
            ) : undefined
          }
        />
      )}

      <CustomerFormDialog
        open={formDialog.open}
        onOpenChange={(open) => setFormDialog((s) => ({ ...s, open }))}
        customer={formDialog.customer}
      />

      {detail.data ? (
        <CustomerDetailSheet
          open={!!detailId}
          onOpenChange={(open) => !open && setDetailId(null)}
          customer={detail.data}
          onEdit={() => setFormDialog({ open: true, customer: detail.data })}
        />
      ) : null}
    </div>
  )
}
