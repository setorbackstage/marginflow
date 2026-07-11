"use client"

import * as React from "react"
import { Plus, Users, MoreHorizontal, Eye, Pencil } from "lucide-react"

import { useCan } from "@/features/auth"
import { useCustomers, CustomerFormDialog, CustomerDetailSheet, CUSTOMER_STATUS_CONFIG } from "@/features/customers"
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

const STATUS_FILTER_LABEL: Record<string, string> = { ALL: "Todos os status", ACTIVE: "Ativos", BLOCKED: "Bloqueados" }

export default function CustomersPage() {
  const canCreate = useCan("customers:create")
  const canEdit = useCan("customers:edit")

  const [searchInput, setSearchInput] = React.useState("")
  const search = useDebouncedValue(searchInput)
  const [statusFilter, setStatusFilter] = React.useState<CustomerStatus | "ALL">("ALL")
  const [page, setPage] = React.useState(1)

  const customers = useCustomers({ page, search: search || undefined, status: statusFilter === "ALL" ? undefined : statusFilter })

  const [formDialog, setFormDialog] = React.useState<{ open: boolean; customer: CustomerDetail | null }>({ open: false, customer: null })
  const [detailId, setDetailId] = React.useState<string | null>(null)
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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Clientes"
        description="Gerencie os clientes cadastrados na sua loja."
        actions={
          canCreate ? (
            <Button size="sm" onClick={() => setFormDialog({ open: true, customer: null })}>
              <Plus data-icon="inline-start" />
              Novo cliente
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <SearchBar value={searchInput} onChange={handleSearchChange} placeholder="Buscar por nome ou telefone..." />
        <Select value={statusFilter} onValueChange={handleFilterChange} items={STATUS_FILTER_LABEL}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os status</SelectItem>
            <SelectItem value="ACTIVE">Ativos</SelectItem>
            <SelectItem value="BLOCKED">Bloqueados</SelectItem>
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
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pedidos</TableHead>
                  <TableHead>Total gasto</TableHead>
                  <TableHead>Último pedido</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.data.items.map((customer: CustomerListItem) => (
                  <TableRow key={customer.id} className="cursor-pointer" onClick={() => setDetailId(customer.id)}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell className="text-muted-foreground">{customer.phone}</TableCell>
                    <TableCell>
                      <StatusBadge status={customer.status} config={CUSTOMER_STATUS_CONFIG} />
                    </TableCell>
                    <TableCell className="tabular-nums">{customer.totalOrders}</TableCell>
                    <TableCell className="tabular-nums">{formatCents(customer.totalSpent)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(customer.lastOrderAt)}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Ações do cliente" />}>
                          <MoreHorizontal />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => setDetailId(customer.id)}>
                            <Eye data-icon="inline-start" />
                            Ver detalhes
                          </DropdownMenuItem>
                          {canEdit ? (
                            <DropdownMenuItem
                              onClick={() => setFormDialog({ open: true, customer: customer as unknown as CustomerDetail })}
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
          title="Nenhum cliente encontrado"
          description={search || statusFilter !== "ALL" ? "Ajuste os filtros ou a busca." : "Comece cadastrando o primeiro cliente."}
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

      <CustomerFormDialog open={formDialog.open} onOpenChange={(open) => setFormDialog((s) => ({ ...s, open }))} customer={formDialog.customer} />

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
