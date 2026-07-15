"use client"

import * as React from "react"
import { ChefHat, Store } from "lucide-react"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"

import { useCan, useActiveStoreId } from "@/features/auth"
import { useKitchenTickets } from "@/features/kitchen"
import { kitchenApi } from "@/features/kitchen/api"
import type { KitchenTicket, KitchenTicketStatus } from "@/features/kitchen/types"
import { ORDER_TYPE_LABEL } from "@/features/orders/status"
import { PageHeader } from "@/components/app-shell/page-container"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { EmptyState, ErrorState, KanbanColumn, KanbanCard, KanbanBoard } from "@/components/shared"
import { cn } from "@/lib/utils"
import { useRealtimeSync } from "@/hooks"

// ─── Columns ────────────────────────────────────────────────────────────────

const COLUMNS: {
  status: KitchenTicketStatus
  title: string
  nextStatus?: KitchenTicketStatus
  actionLabel?: string
  accent: string
}[] = [
  { status: "QUEUED",    title: "Fila",        nextStatus: "PREPARING", actionLabel: "Iniciar preparo", accent: "border-l-orange-400"  },
  { status: "PREPARING", title: "Preparando",  nextStatus: "READY",     actionLabel: "Marcar pronto",   accent: "border-l-blue-400"    },
  { status: "READY",     title: "Pronto",                                                                accent: "border-l-green-500"   },
]

// Valid DnD transitions: can only advance, never go backwards
const VALID_TRANSITIONS: Partial<Record<KitchenTicketStatus, KitchenTicketStatus>> = {
  QUEUED:    "PREPARING",
  PREPARING: "READY",
}

// ─── Timer display ──────────────────────────────────────────────────────────

function TicketTimer({ minutes }: { minutes: number }) {
  const isUrgent  = minutes >= 15
  const isCritical = minutes >= 25

  return (
    <div className={cn(
      "flex items-end gap-0.5 tabular-nums leading-none",
      isCritical ? "text-destructive" : isUrgent ? "text-amber-500" : "text-muted-foreground",
    )}>
      <span className="text-3xl font-bold">{minutes}</span>
      <span className="mb-0.5 text-sm font-medium">min</span>
    </div>
  )
}

// ─── Card ───────────────────────────────────────────────────────────────────

function TicketCard({
  ticket,
  nextStatus,
  actionLabel,
  onAdvance,
  isDragging,
}: {
  ticket: KitchenTicket
  nextStatus?: KitchenTicketStatus
  actionLabel?: string
  onAdvance?: () => void
  isDragging?: boolean
}) {
  const canUpdate = useCan("kitchen:update_status")
  const isUrgent  = ticket.minutesInQueue >= 15

  return (
    <KanbanCard
      draggableId={canUpdate ? ticket.id : undefined}
      draggableData={{ status: ticket.status }}
      className={cn(isDragging && "opacity-40", isUrgent && "border-amber-400/60")}
    >
      {/* Header: order number + channel + timer */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-semibold">#{ticket.orderNumber}</p>
            {ticket.orderType === "DELIVERY" && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-[#ea1d2c]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#ea1d2c] leading-none">
                <Store className="size-2.5" />
                iFood
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{ORDER_TYPE_LABEL[ticket.orderType] ?? ticket.orderType}</p>
        </div>
        <TicketTimer minutes={ticket.minutesInQueue} />
      </div>

      {/* Items */}
      <ul className="mt-3 space-y-1.5">
        {ticket.items.map((item) => (
          <li key={item.id} className="text-sm">
            <span className="font-semibold">{item.quantity}×</span>{" "}
            {item.productName}
            {item.modifierSummary.length > 0 && (
              <span className="text-xs text-muted-foreground"> ({item.modifierSummary.join(", ")})</span>
            )}
            {item.notes && (
              <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">⚠ {item.notes}</p>
            )}
          </li>
        ))}
      </ul>

      {ticket.notes && (
        <p className="mt-2 rounded-md bg-muted/50 px-2 py-1.5 text-xs text-muted-foreground">
          Obs: {ticket.notes}
        </p>
      )}

      {nextStatus && canUpdate && (
        <Button
          size="sm"
          className="mt-3 w-full"
          onClick={onAdvance}
        >
          {actionLabel}
        </Button>
      )}
    </KanbanCard>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function KitchenPage() {
  const tickets    = useKitchenTickets()
  const storeId    = useActiveStoreId()
  const queryClient = useQueryClient()
  const canUpdate  = useCan("kitchen:update_status")
  useRealtimeSync({ table: "kitchen_tickets", storeId, queryKeys: [["kitchen", storeId]] })

  // Live clock so the timer increments every minute without a refetch
  const [, setTick] = React.useState(0)
  React.useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  const handleAdvance = React.useCallback(
    async (ticketId: string, newStatus: KitchenTicketStatus) => {
      try {
        await kitchenApi.updateTicketStatus(storeId, ticketId, newStatus)
        queryClient.invalidateQueries({ queryKey: ["kitchen", storeId] })
        queryClient.invalidateQueries({ queryKey: ["orders", storeId] })
        queryClient.invalidateQueries({ queryKey: ["delivery", storeId] })
      } catch {
        toast.error("Não foi possível atualizar o ticket.")
      }
    },
    [storeId, queryClient],
  )

  const handleCardDrop = React.useCallback(
    (cardId: string, newColumnId: string) => {
      if (!canUpdate) return
      const ticket = tickets.data?.find((t) => t.id === cardId)
      if (!ticket) return
      const validNext = VALID_TRANSITIONS[ticket.status as KitchenTicketStatus]
      if (validNext === newColumnId) {
        void handleAdvance(cardId, validNext)
      }
    },
    [canUpdate, tickets.data, handleAdvance],
  )

  const allTickets = tickets.data ?? []

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Cozinha"
        description="Painel de produção — atualiza em tempo real."
      />

      {tickets.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : tickets.isError ? (
        <ErrorState error={tickets.error} onRetry={() => tickets.refetch()} />
      ) : allTickets.length > 0 ? (
        <KanbanBoard onCardDrop={handleCardDrop} renderOverlay={(id) => {
          const t = allTickets.find((x) => x.id === id)
          if (!t) return null
          return (
            <KanbanCard className="w-72 shadow-xl">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold">#{t.orderNumber}</p>
                <TicketTimer minutes={t.minutesInQueue} />
              </div>
            </KanbanCard>
          )
        }}>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {COLUMNS.map((col) => {
              const colTickets = allTickets.filter((t) => t.status === col.status)
              return (
                <KanbanColumn
                  key={col.status}
                  title={col.title}
                  count={colTickets.length}
                  droppableId={col.status}
                  accentColor={col.accent}
                >
                  {colTickets.map((ticket) => (
                    <TicketCard
                      key={ticket.id}
                      ticket={ticket}
                      nextStatus={col.nextStatus}
                      actionLabel={col.actionLabel}
                      onAdvance={() => col.nextStatus && handleAdvance(ticket.id, col.nextStatus)}
                    />
                  ))}
                  {colTickets.length === 0 && (
                    <p className="px-1 py-8 text-center text-xs text-muted-foreground">
                      Nenhum pedido aqui
                    </p>
                  )}
                </KanbanColumn>
              )
            })}
          </div>
        </KanbanBoard>
      ) : (
        <EmptyState
          icon={ChefHat}
          title="Cozinha livre"
          description="Quando um pedido for confirmado, ele entra automaticamente na fila de preparo."
        />
      )}
    </div>
  )
}
