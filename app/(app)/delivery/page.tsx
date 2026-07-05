"use client"

import * as React from "react"
import { Truck, User, Loader2, ArrowRight, X } from "lucide-react"

import { useCan } from "@/features/auth"
import { useDeliveries, useUpdateDeliveryStatus, AssignCourierDialog, DELIVERY_STATUS_CONFIG } from "@/features/delivery"
import type { Delivery, DeliveryStatus } from "@/features/delivery/types"
import { PageHeader } from "@/components/app-shell/page-container"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { EmptyState, ErrorState, KanbanColumn, KanbanCard, StatusBadge } from "@/components/shared"

const COLUMNS: { status: DeliveryStatus; title: string; nextStatus?: DeliveryStatus; actionLabel?: string }[] = [
  { status: "AWAITING_PICKUP", title: "Aguardando", nextStatus: "DISPATCHED", actionLabel: "Despachar" },
  { status: "DISPATCHED", title: "Despachado", nextStatus: "IN_TRANSIT", actionLabel: "Em rota" },
  { status: "IN_TRANSIT", title: "Em rota", nextStatus: "DELIVERED", actionLabel: "Marcar entregue" },
  { status: "DELIVERED", title: "Entregue" },
  { status: "FAILED", title: "Falhou" },
]

function DeliveryCard({ delivery, nextStatus, actionLabel }: { delivery: Delivery; nextStatus?: DeliveryStatus; actionLabel?: string }) {
  const canUpdate = useCan("delivery:update_status")
  const canAssign = useCan("delivery:assign_courier")
  const updateStatus = useUpdateDeliveryStatus()
  const [assignOpen, setAssignOpen] = React.useState(false)
  const [failOpen, setFailOpen] = React.useState(false)
  const [failReason, setFailReason] = React.useState("")

  const canFail = (delivery.status === "DISPATCHED" || delivery.status === "IN_TRANSIT") && canUpdate

  return (
    <>
      <KanbanCard>
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium">Pedido #{delivery.orderNumber}</p>
          <StatusBadge status={delivery.status} config={DELIVERY_STATUS_CONFIG} />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {delivery.deliveryAddress.street}, {delivery.deliveryAddress.number} — {delivery.deliveryAddress.neighborhood}
        </p>

        {delivery.courierName ? (
          <p className="mt-2 flex items-center gap-1.5 text-xs">
            <User className="size-3.5 text-muted-foreground" />
            {delivery.courierName}
            {delivery.courierPhone ? <span className="text-muted-foreground">· {delivery.courierPhone}</span> : null}
          </p>
        ) : canAssign ? (
          <Button variant="outline" size="sm" className="mt-2 w-full" onClick={() => setAssignOpen(true)}>
            Atribuir entregador
          </Button>
        ) : null}

        {delivery.failedReason ? <p className="mt-2 text-xs text-destructive">Motivo: {delivery.failedReason}</p> : null}

        <div className="mt-3 flex gap-2">
          {nextStatus && canUpdate ? (
            <Button
              size="sm"
              className="flex-1"
              disabled={updateStatus.isPending}
              onClick={() => updateStatus.mutate({ deliveryId: delivery.id, status: nextStatus })}
            >
              {updateStatus.isPending ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight data-icon="inline-start" />}
              {actionLabel}
            </Button>
          ) : null}
          {canFail ? (
            <Button size="sm" variant="outline" onClick={() => setFailOpen(true)}>
              <X data-icon="inline-start" />
              Falhar
            </Button>
          ) : null}
        </div>
      </KanbanCard>

      {canAssign ? <AssignCourierDialog open={assignOpen} onOpenChange={setAssignOpen} delivery={delivery} /> : null}

      <Dialog open={failOpen} onOpenChange={setFailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar entrega como falha — Pedido #{delivery.orderNumber}</DialogTitle>
          </DialogHeader>
          <div>
            <Label htmlFor="fail-reason" className="mb-1.5">
              Motivo
            </Label>
            <Textarea id="fail-reason" rows={3} value={failReason} onChange={(e) => setFailReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button
              variant="destructive"
              disabled={failReason.trim().length === 0 || updateStatus.isPending}
              onClick={() =>
                updateStatus.mutate(
                  { deliveryId: delivery.id, status: "FAILED", reason: failReason },
                  {
                    onSuccess: () => {
                      setFailOpen(false)
                      setFailReason("")
                    },
                  },
                )
              }
            >
              {updateStatus.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Confirmar falha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default function DeliveryPage() {
  const deliveries = useDeliveries()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Entregas" description="Painel de despacho e acompanhamento — atualiza automaticamente." />

      {deliveries.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : deliveries.isError ? (
        <ErrorState error={deliveries.error} onRetry={() => deliveries.refetch()} />
      ) : deliveries.data && deliveries.data.items.length > 0 ? (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {COLUMNS.map((column) => {
            const columnDeliveries = (deliveries.data?.items ?? []).filter((d) => d.status === column.status)
            return (
              <KanbanColumn key={column.status} title={column.title} count={columnDeliveries.length}>
                {columnDeliveries.map((delivery) => (
                  <DeliveryCard key={delivery.id} delivery={delivery} nextStatus={column.nextStatus} actionLabel={column.actionLabel} />
                ))}
                {columnDeliveries.length === 0 ? <p className="px-1 py-6 text-center text-xs text-muted-foreground">Nenhuma entrega</p> : null}
              </KanbanColumn>
            )
          })}
        </div>
      ) : (
        <EmptyState icon={Truck} title="Nenhuma entrega ativa" description="Entregas aparecem aqui quando um pedido de delivery fica pronto." />
      )}
    </div>
  )
}
