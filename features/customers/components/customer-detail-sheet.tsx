"use client"

import * as React from "react"
import Link from "next/link"
import { Plus, Pencil, Trash2, MapPin, Ban, CheckCircle2, ReceiptText, ExternalLink } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { EmptyState, ErrorState, ConfirmDialog, StatusBadge } from "@/components/shared"
import { formatCents, formatDate } from "@/lib/format"
import { useCan } from "@/features/auth"
import { useAddresses, useDeleteAddress, useCustomerOrders, useBlockCustomer } from "@/features/customers/hooks"
import { CUSTOMER_STATUS_CONFIG, ADDRESS_LABEL_TEXT } from "@/features/customers/status"
import { ORDER_STATUS_CONFIG } from "@/features/orders"
import { AddressFormDialog } from "./address-form-dialog"
import type { Address, CustomerDetail } from "@/features/customers/types"

export function CustomerDetailSheet({
  open,
  onOpenChange,
  customer,
  onEdit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer: CustomerDetail
  onEdit: () => void
}) {
  const canEdit = useCan("customers:edit")
  const canBlock = useCan("customers:block")

  const addresses = useAddresses(customer.id)
  const deleteAddress = useDeleteAddress(customer.id)
  const orders = useCustomerOrders(customer.id)
  const blockCustomer = useBlockCustomer()

  const [addressDialog, setAddressDialog] = React.useState<{ open: boolean; address: Address | null }>({ open: false, address: null })
  const [deleteTarget, setDeleteTarget] = React.useState<Address | null>(null)
  const [blockConfirm, setBlockConfirm] = React.useState(false)

  const isBlocked = customer.status === "BLOCKED"

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-lg">
          <SheetHeader className="border-b">
            <div className="flex items-start justify-between gap-2">
              <div>
                <SheetTitle>{customer.name}</SheetTitle>
                <SheetDescription>{customer.phone}</SheetDescription>
              </div>
              <StatusBadge status={customer.status} config={CUSTOMER_STATUS_CONFIG} />
            </div>
          </SheetHeader>

          <div className="flex-1 space-y-6 p-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Total de pedidos</p>
                <p className="text-lg font-semibold tabular-nums">{customer.totalOrders}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Total gasto</p>
                <p className="text-lg font-semibold tabular-nums">{formatCents(customer.totalSpent)}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => { window.location.href = `/customers/${customer.id}` }}>
                <ExternalLink data-icon="inline-start" />
                Ver perfil completo
              </Button>
              {canEdit ? (
                <Button variant="outline" size="sm" onClick={onEdit}>
                  <Pencil data-icon="inline-start" />
                  Editar dados
                </Button>
              ) : null}
              {canBlock ? (
                <Button variant="outline" size="sm" onClick={() => setBlockConfirm(true)}>
                  {isBlocked ? <CheckCircle2 data-icon="inline-start" /> : <Ban data-icon="inline-start" />}
                  {isBlocked ? "Desbloquear" : "Bloquear"}
                </Button>
              ) : null}
            </div>

            {customer.notes ? (
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <p className="mb-1 text-xs font-medium text-muted-foreground">Observações</p>
                {customer.notes}
              </div>
            ) : null}

            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-medium">Endereços</h3>
                {canEdit ? (
                  <Button variant="ghost" size="sm" onClick={() => setAddressDialog({ open: true, address: null })}>
                    <Plus data-icon="inline-start" />
                    Adicionar
                  </Button>
                ) : null}
              </div>
              {addresses.isLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : addresses.isError ? (
                <ErrorState error={addresses.error} onRetry={() => addresses.refetch()} />
              ) : addresses.data && addresses.data.length > 0 ? (
                <div className="space-y-2">
                  {addresses.data.map((address) => (
                    <div key={address.id} className="flex items-start justify-between gap-2 rounded-lg border p-3 text-sm">
                      <div className="flex gap-2">
                        <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium">{address.label ? ADDRESS_LABEL_TEXT[address.label] : "Endereço"}</span>
                            {address.isDefault ? <Badge variant="secondary">Padrão</Badge> : null}
                          </div>
                          <p className="text-muted-foreground">
                            {address.street}, {address.number}
                            {address.complement ? ` — ${address.complement}` : ""}
                            <br />
                            {address.neighborhood}, {address.city}/{address.state} · {address.postalCode}
                          </p>
                        </div>
                      </div>
                      {canEdit ? (
                        <div className="flex shrink-0 gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Editar endereço"
                            onClick={() => setAddressDialog({ open: true, address })}
                          >
                            <Pencil />
                          </Button>
                          <Button variant="ghost" size="icon-sm" aria-label="Excluir endereço" onClick={() => setDeleteTarget(address)}>
                            <Trash2 />
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum endereço salvo. Endereços são adicionados automaticamente ao fechar um pedido de delivery.</p>
              )}
            </div>

            <div>
              <h3 className="mb-2 text-sm font-medium">Pedidos recentes</h3>
              {orders.isLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : orders.isError ? (
                <ErrorState error={orders.error} onRetry={() => orders.refetch()} />
              ) : orders.data && orders.data.items.length > 0 ? (
                <div className="space-y-2">
                  {orders.data.items.map((order) => (
                    <div key={order.id} className="flex items-center justify-between rounded-lg border p-2.5 text-sm">
                      <div>
                        <p className="font-medium">Pedido #{order.number}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="tabular-nums">{formatCents(order.grandTotal)}</p>
                        <StatusBadge status={order.status} config={ORDER_STATUS_CONFIG} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={ReceiptText} title="Nenhum pedido ainda" description="O histórico de compras deste cliente aparecerá aqui." />
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AddressFormDialog
        open={addressDialog.open}
        onOpenChange={(o) => setAddressDialog((s) => ({ ...s, open: o }))}
        customerId={customer.id}
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
            ? `Tem certeza que deseja desbloquear "${customer.name}"? O cliente voltará a poder fazer pedidos.`
            : `Tem certeza que deseja bloquear "${customer.name}"? O cliente não poderá mais fazer pedidos.`
        }
        confirmLabel={isBlocked ? "Desbloquear" : "Bloquear"}
        variant={isBlocked ? "default" : "destructive"}
        isLoading={blockCustomer.isPending}
        onConfirm={() => {
          blockCustomer.mutate(
            { customerId: customer.id, status: isBlocked ? "ACTIVE" : "BLOCKED" },
            { onSuccess: () => setBlockConfirm(false) },
          )
        }}
      />
    </>
  )
}
