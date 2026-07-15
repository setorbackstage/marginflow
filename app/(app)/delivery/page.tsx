"use client"

import * as React from "react"
import { Truck, User, Phone, Clock, Loader2, ArrowRight, X, ExternalLink } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"

import { useCan, useActiveStoreId } from "@/features/auth"
import { useDeliveries, useUpdateDeliveryStatus, AssignCourierDialog, DELIVERY_STATUS_CONFIG } from "@/features/delivery"
import { deliveryApi } from "@/features/delivery/api"
import type { Delivery, DeliveryStatus } from "@/features/delivery/types"
import { useOrdersByIds } from "@/features/orders"
import { PageHeader } from "@/components/app-shell/page-container"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { EmptyState, ErrorState, KanbanColumn, KanbanCard, KanbanBoard, StatusBadge } from "@/components/shared"
import { formatRelative } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useRealtimeSync } from "@/hooks"

const COLUMNS: {
  status: DeliveryStatus
  title: string
  nextStatus?: DeliveryStatus
  actionLabel?: string
  accent: string
}[] = [
  { status: "AWAITING_PICKUP", title: "Aguardando", nextStatus: "DISPATCHED",  actionLabel: "Despachar",       accent: "border-l-orange-400"    },
  { status: "DISPATCHED",      title: "Saiu",        nextStatus: "IN_TRANSIT",  actionLabel: "Em rota",         accent: "border-l-blue-400"      },
  { status: "IN_TRANSIT",      title: "Em rota",     nextStatus: "DELIVERED",   actionLabel: "Marcar entregue", accent: "border-l-purple-400"    },
  { status: "DELIVERED",       title: "Entregue",                                                                accent: "border-l-green-500"     },
  { status: "FAILED",          title: "Falhou",                                                                  accent: "border-l-destructive/60" },
]

const VALID_DND_TRANSITIONS: Partial<Record<DeliveryStatus, DeliveryStatus>> = {
  AWAITING_PICKUP: "DISPATCHED",
  DISPATCHED:      "IN_TRANSIT",
  IN_TRANSIT:      "DELIVERED",
}

function minutesSince(isoDate: string): number {
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / 60_000)
}

const URGENT_MINUTES_THRESHOLD = 30

function DeliveryCard({
  delivery,
  customerName,
  customerPhone,
  nextStatus,
  actionLabel,
}: {
  delivery: Delivery
  customerName: string | null
  customerPhone: string | null
  nextStatus?: DeliveryStatus
  actionLabel?: string
}) {
  const router = useRouter()
  const canUpdate = useCan("delivery:update_status")
  const canAssign = useCan("delivery:assign_courier")
  const updateStatus = useUpdateDeliveryStatus()
  const [assignOpen, setAssignOpen] = React.useState(false)
  const [failOpen, setFailOpen]     = React.useState(false)
  const [failReason, setFailReason] = React.useState("")

  const isPlatformDelivery = delivery.courierType === "PLATFORM"
  const canFail = (delivery.status === "DISPATCHED" || delivery.status === "IN_TRANSIT") && canUpdate
  const isActive = delivery.status !== "DELIVERED" && delivery.status !== "FAILED" && delivery.status !== "RETURNED"
  const elapsedMinutes = minutesSince(delivery.createdAt)
  const isUrgent = isActive && elapsedMinutes >= URGENT_MINUTES_THRESHOLD

  return (
    <>
      <KanbanCard
        draggableId={canUpdate ? delivery.id : undefined}
        draggableData={{ status: delivery.status }}
        className={cn(isUrgent && "border-destructive/50")}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold">Pedido #{delivery.orderNumber}</p>
          <StatusBadge status={delivery.status} config={DELIVERY_STATUS_CONFIG} />
        </div>
        {customerName ? (
          <p className="mt-1 flex items-center gap-1.5 text-xs">
            <User className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{customerName}</span>
          </p>
        ) : null}
        {customerPhone ? (
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Phone className="size-3.5 shrink-0" />
            {customerPhone}
          </p>
        ) : null}
        <p className="mt-1 text-xs text-muted-foreground">
          {delivery.deliveryAddress.street}, {delivery.deliveryAddress.number} — {delivery.deliveryAddress.neighborhood}
        </p>
        <p className={cn("mt-1 flex items-center gap-1.5 text-xs", isUrgent ? "font-medium text-destructive" : "text-muted-foreground")}>
          <Clock className="size-3.5 shrink-0" />
          {formatRelative(delivery.createdAt)}
        </p>

        {isPlatformDelivery ? (
          <div className="mt-2">
            <Badge variant="secondary" className="text-xs">
              {delivery.platform === "IFOOD" ? "iFood" : delivery.platform} — entrega pela plataforma
            </Badge>
          </div>
        ) : delivery.courierName ? (
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
          {delivery.status === "DELIVERED" && !isPlatformDelivery ? (
            <Button size="sm" variant="outline" className="flex-1" onClick={() => router.push(`/orders/${delivery.orderId}`)}>
              <ExternalLink data-icon="inline-start" />
              Ver pedido
            </Button>
          ) : null}
        </div>
      </KanbanCard>

      {canAssign && !isPlatformDelivery ? <AssignCourierDialog open={assignOpen} onOpenChange={setAssignOpen} delivery={delivery} /> : null}

      <Dialog open={failOpen} onOpenChange={setFailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar entrega como falha — Pedido #{delivery.orderNumber}</DialogTitle>
          </DialogHeader>
          <div>
            <Label htmlFor="fail-reason" className="mb-1.5">Motivo</Label>
            <Textarea id="fail-reason" rows={3} value={failReason} onChange={(e) => setFailReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button
              variant="destructive"
              disabled={failReason.trim().length === 0 || updateStatus.isPending}
              onClick={() =>
                updateStatus.mutate(
                  { deliveryId: delivery.id, status: "FAILED", reason: failReason },
                  { onSuccess: () => { setFailOpen(false); setFailReason("") } },
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
  const deliveries  = useDeliveries()
  const storeId     = useActiveStoreId()
  const queryClient = useQueryClient()
  const canUpdate   = useCan("delivery:update_status")
  useRealtimeSync({ table: "deliveries", storeId, queryKeys: [["delivery", storeId]] })
  const orderIds    = deliveries.data?.items.map((d) => d.orderId) ?? []
  const ordersById  = useOrdersByIds(orderIds)

  const handleCardDrop = React.useCallback(
    async (cardId: string, newColumnId: string) => {
      if (!canUpdate) return
      const delivery = deliveries.data?.items.find((d) => d.id === cardId)
      if (!delivery) return
      const validNext = VALID_DND_TRANSITIONS[delivery.status as DeliveryStatus]
      if (validNext !== newColumnId) return

      try {
        await deliveryApi.updateStatus(storeId, cardId, newColumnId)
        queryClient.invalidateQueries({ queryKey: ["delivery", storeId] })
        queryClient.invalidateQueries({ queryKey: ["orders", storeId] })
      } catch {
        toast.error("Não foi possível mover a entrega.")
      }
    },
    [canUpdate, deliveries.data, storeId, queryClient],
  )

  const allDeliveries = deliveries.data?.items ?? []

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Entregas" description="Painel de despacho — atualiza em tempo real." />

      {deliveries.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : deliveries.isError ? (
        <ErrorState error={deliveries.error} onRetry={() => deliveries.refetch()} />
      ) : allDeliveries.length > 0 ? (
        <KanbanBoard
          onCardDrop={handleCardDrop}
          renderOverlay={(id) => {
            const d = allDeliveries.find((x) => x.id === id)
            if (!d) return null
            return (
              <KanbanCard className="w-64 shadow-xl">
                <p className="font-semibold">Pedido #{d.orderNumber}</p>
                <p className="text-xs text-muted-foreground">{d.deliveryAddress.neighborhood}</p>
              </KanbanCard>
            )
          }}
        >
          <div className="flex gap-4 overflow-x-auto pb-2">
            {COLUMNS.map((column) => {
              const colDeliveries = allDeliveries.filter((d) => d.status === column.status)
              return (
                <KanbanColumn
                  key={column.status}
                  title={column.title}
                  count={colDeliveries.length}
                  droppableId={column.status}
                  accentColor={column.accent}
                >
                  {colDeliveries.map((delivery) => (
                    <DeliveryCard
                      key={delivery.id}
                      delivery={delivery}
                      customerName={ordersById.get(delivery.orderId)?.customer?.name ?? null}
                      customerPhone={ordersById.get(delivery.orderId)?.customer?.phone ?? null}
                      nextStatus={column.nextStatus}
                      actionLabel={column.actionLabel}
                    />
                  ))}
                  {colDeliveries.length === 0 ? (
                    <p className="px-1 py-8 text-center text-xs text-muted-foreground">Sem entregas aqui</p>
                  ) : null}
                </KanbanColumn>
              )
            })}
          </div>
        </KanbanBoard>
      ) : (
        <EmptyState
          icon={Truck}
          title="Nenhuma entrega em andamento"
          description="Quando um pedido de delivery for marcado como pronto na cozinha, ele aparece aqui para despacho."
        />
      )}
    </div>
  )
}
