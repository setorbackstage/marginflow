"use client"

import { ChefHat, Clock, ArrowRight, Loader2 } from "lucide-react"

import { useCan } from "@/features/auth"
import { useKitchenTickets, useUpdateTicketStatus } from "@/features/kitchen"
import type { KitchenTicket, KitchenTicketStatus } from "@/features/kitchen/types"
import { ORDER_TYPE_LABEL } from "@/features/orders/status"
import { PageHeader } from "@/components/app-shell/page-container"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { EmptyState, ErrorState, KanbanColumn, KanbanCard } from "@/components/shared"

const COLUMNS: { status: KitchenTicketStatus; title: string; nextStatus?: KitchenTicketStatus; actionLabel?: string }[] = [
  { status: "QUEUED", title: "Recebido", nextStatus: "PREPARING", actionLabel: "Iniciar preparo" },
  { status: "PREPARING", title: "Preparando", nextStatus: "READY", actionLabel: "Marcar pronto" },
  { status: "READY", title: "Pronto" },
]

function TicketCard({ ticket, nextStatus, actionLabel }: { ticket: KitchenTicket; nextStatus?: KitchenTicketStatus; actionLabel?: string }) {
  const canUpdate = useCan("kitchen:update_status")
  const updateStatus = useUpdateTicketStatus()
  const isUrgent = ticket.minutesInQueue >= 15

  return (
    <KanbanCard>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium">Pedido #{ticket.orderNumber}</p>
          <p className="text-xs text-muted-foreground">{ORDER_TYPE_LABEL[ticket.orderType] ?? ticket.orderType}</p>
        </div>
        <Badge variant={isUrgent ? "destructive" : "secondary"} className="shrink-0">
          <Clock className="mr-1 size-3" />
          {ticket.minutesInQueue} min
        </Badge>
      </div>

      <ul className="mt-2 space-y-1 text-sm">
        {ticket.items.map((item) => (
          <li key={item.id}>
            <span className="font-medium">{item.quantity}×</span> {item.productName}
            {item.modifierSummary.length > 0 ? (
              <span className="text-xs text-muted-foreground"> ({item.modifierSummary.join(", ")})</span>
            ) : null}
          </li>
        ))}
      </ul>

      {ticket.notes ? <p className="mt-2 text-xs text-muted-foreground">Obs: {ticket.notes}</p> : null}

      {nextStatus && canUpdate ? (
        <Button
          size="sm"
          className="mt-3 w-full"
          disabled={updateStatus.isPending}
          onClick={() => updateStatus.mutate({ ticketId: ticket.id, status: nextStatus })}
        >
          {updateStatus.isPending ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight data-icon="inline-start" />}
          {actionLabel}
        </Button>
      ) : null}
    </KanbanCard>
  )
}

export default function KitchenPage() {
  const tickets = useKitchenTickets()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Cozinha" description="Painel de produção — atualiza automaticamente." />

      {tickets.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : tickets.isError ? (
        <ErrorState error={tickets.error} onRetry={() => tickets.refetch()} />
      ) : tickets.data && tickets.data.length > 0 ? (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {COLUMNS.map((column) => {
            const columnTickets = (tickets.data ?? []).filter((t) => t.status === column.status)
            return (
              <KanbanColumn key={column.status} title={column.title} count={columnTickets.length}>
                {columnTickets.map((ticket) => (
                  <TicketCard key={ticket.id} ticket={ticket} nextStatus={column.nextStatus} actionLabel={column.actionLabel} />
                ))}
                {columnTickets.length === 0 ? <p className="px-1 py-6 text-center text-xs text-muted-foreground">Nenhum pedido aqui</p> : null}
              </KanbanColumn>
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon={ChefHat}
          title="Cozinha livre por agora"
          description="Quando um pedido for confirmado, ele entra automaticamente na fila de preparo aqui."
        />
      )}
    </div>
  )
}
