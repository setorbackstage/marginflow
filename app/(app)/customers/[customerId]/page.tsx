"use client"

import * as React from "react"
import { use } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, Pencil, Ban, CheckCircle2, MapPin, ReceiptText,
  ShoppingBag, Banknote, TrendingUp, CalendarDays, Plus, Trash2,
} from "lucide-react"

import { useCan } from "@/features/auth"
import {
  useCustomer, useCustomerOrders, useAddresses,
  useDeleteAddress, useBlockCustomer,
  CustomerFormDialog, CustomerDetailSheet,
  CUSTOMER_STATUS_CONFIG, ADDRESS_LABEL_TEXT,
} from "@/features/customers"
import { AddressFormDialog } from "@/features/customers/components/address-form-dialog"
import type { Address, CustomerDetail } from "@/features/customers/types"
import { ORDER_STATUS_CONFIG } from "@/features/orders"
import { PageHeader } from "@/components/app-shell/page-container"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState, ErrorState, ConfirmDialog, PaginationBar, StatusBadge } from "@/components/shared"
import { formatCents, formatDate, formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"

// ─── Stat card ───────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, sub }: { label: string; value: string; icon: React.ElementType; sub?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-background p-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="size-5 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold tabular-nums leading-tight">{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CustomerProfilePage({ params }: { params: Promise<{ customerId: string }> }) {
  const { customerId } = use(params)
  const router   = useRouter()
  const canEdit  = useCan("customers:edit")
  const canBlock = useCan("customers:block")

  const customer     = useCustomer(customerId)
  const addresses    = useAddresses(customerId)
  const deleteAddress = useDeleteAddress(customerId)
  const blockCustomer = useBlockCustomer()

  const [ordersPage, setOrdersPage] = React.useState(1)
  const orders = useCustomerOrders(customerId, { page: ordersPage, limit: 20 })

  const [formOpen,       setFormOpen]       = React.useState(false)
  const [addressDialog,  setAddressDialog]  = React.useState<{ open: boolean; address: Address | null }>({ open: false, address: null })
  const [deleteTarget,   setDeleteTarget]   = React.useState<Address | null>(null)
  const [blockConfirm,   setBlockConfirm]   = React.useState(false)

  if (customer.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-9 w-48" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (customer.isError || !customer.data) {
    return <ErrorState error={customer.error} onRetry={() => customer.refetch()} />
  }

  const c = customer.data
  const isBlocked = c.status === "BLOCKED"
  const ticketMedio = c.totalOrders > 0 ? Math.round(c.totalSpent / c.totalOrders) : 0

  return (
    <>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon-sm" onClick={() => router.back()} aria-label="Voltar">
            <ArrowLeft />
          </Button>
          <PageHeader
            title={c.name}
            description={c.email ? `${c.phone} · ${c.email}` : c.phone}
            actions={
              <div className="flex items-center gap-2">
                <StatusBadge status={c.status} config={CUSTOMER_STATUS_CONFIG} />
                {canEdit && (
                  <Button variant="outline" size="sm" onClick={() => setFormOpen(true)}>
                    <Pencil data-icon="inline-start" />
                    Editar
                  </Button>
                )}
                {canBlock && (
                  <Button variant="outline" size="sm" onClick={() => setBlockConfirm(true)}>
                    {isBlocked ? <CheckCircle2 data-icon="inline-start" /> : <Ban data-icon="inline-start" />}
                    {isBlocked ? "Desbloquear" : "Bloquear"}
                  </Button>
                )}
              </div>
            }
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Total de pedidos"  value={String(c.totalOrders)}          icon={ShoppingBag} />
          <StatCard label="Total gasto"        value={formatCents(c.totalSpent)}      icon={Banknote}    />
          <StatCard label="Ticket médio"       value={formatCents(ticketMedio)}       icon={TrendingUp}  />
          <StatCard label="Cliente desde"      value={formatDate(c.createdAt)}        icon={CalendarDays}
            sub={c.lastOrderAt ? `Último pedido ${formatDate(c.lastOrderAt)}` : undefined}
          />
        </div>

        {/* Notes */}
        {c.notes && (
          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="mb-1 text-xs font-medium text-muted-foreground">Observações</p>
            <p className="text-sm">{c.notes}</p>
          </div>
        )}

        {/* Addresses */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Endereços</h2>
            {canEdit && (
              <Button variant="ghost" size="sm" onClick={() => setAddressDialog({ open: true, address: null })}>
                <Plus data-icon="inline-start" />
                Adicionar
              </Button>
            )}
          </div>
          {addresses.isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : addresses.isError ? (
            <ErrorState error={addresses.error} onRetry={() => addresses.refetch()} />
          ) : addresses.data && addresses.data.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {addresses.data.map((address) => (
                <div key={address.id} className="flex items-start justify-between gap-2 rounded-xl border p-4 text-sm">
                  <div className="flex gap-2">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium">{address.label ? ADDRESS_LABEL_TEXT[address.label] : "Endereço"}</span>
                        {address.isDefault && <Badge variant="secondary" className="text-xs">Padrão</Badge>}
                      </div>
                      <p className="mt-0.5 text-muted-foreground">
                        {address.street}, {address.number}
                        {address.complement ? ` — ${address.complement}` : ""}
                      </p>
                      <p className="text-muted-foreground">{address.neighborhood}, {address.city}/{address.state}</p>
                      <p className="text-muted-foreground">{address.postalCode}</p>
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex shrink-0 gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => setAddressDialog({ open: true, address })}>
                        <Pencil />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => setDeleteTarget(address)}>
                        <Trash2 />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum endereço salvo.</p>
          )}
        </section>

        {/* Order history */}
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">Histórico de pedidos</h2>
          {orders.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : orders.isError ? (
            <ErrorState error={orders.error} onRetry={() => orders.refetch()} />
          ) : orders.data && orders.data.items.length > 0 ? (
            <>
              <div className="flex flex-col gap-2">
                {orders.data.items.map((order) => (
                  <div
                    key={order.id}
                    className="flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-colors hover:bg-muted/30"
                    onClick={() => router.push(`/orders/${order.id}`)}
                  >
                    <div>
                      <p className="font-medium">Pedido #{order.number}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(order.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="tabular-nums">{formatCents(order.grandTotal)}</p>
                      <StatusBadge status={order.status} config={ORDER_STATUS_CONFIG} />
                    </div>
                  </div>
                ))}
              </div>
              <PaginationBar pagination={orders.data.pagination} onPageChange={setOrdersPage} />
            </>
          ) : (
            <EmptyState icon={ReceiptText} title="Nenhum pedido registrado" description="Os pedidos deste cliente aparecerão aqui." />
          )}
        </section>
      </div>

      {/* Dialogs */}
      <CustomerFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        customer={c}
      />

      <AddressFormDialog
        open={addressDialog.open}
        onOpenChange={(o) => setAddressDialog((s) => ({ ...s, open: o }))}
        customerId={customerId}
        address={addressDialog.address}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Excluir endereço"
        description="Tem certeza que deseja excluir este endereço?"
        confirmLabel="Excluir"
        variant="destructive"
        isLoading={deleteAddress.isPending}
        onConfirm={() => {
          if (!deleteTarget) return
          deleteAddress.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
        }}
      />

      <ConfirmDialog
        open={blockConfirm}
        onOpenChange={setBlockConfirm}
        title={isBlocked ? "Desbloquear cliente" : "Bloquear cliente"}
        description={
          isBlocked
            ? `Desbloquear "${c.name}"? O cliente voltará a poder fazer pedidos.`
            : `Bloquear "${c.name}"? O cliente não poderá mais fazer pedidos.`
        }
        confirmLabel={isBlocked ? "Desbloquear" : "Bloquear"}
        variant={isBlocked ? "default" : "destructive"}
        isLoading={blockCustomer.isPending}
        onConfirm={() => {
          blockCustomer.mutate(
            { customerId, status: isBlocked ? "ACTIVE" : "BLOCKED" },
            { onSuccess: () => setBlockConfirm(false) },
          )
        }}
      />
    </>
  )
}
