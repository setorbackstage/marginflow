import { Skeleton } from "@/components/ui/skeleton"
import { ErrorState, StatusBadge } from "@/components/shared"
import { formatDateTime } from "@/lib/format"
import { useOrderTimeline } from "@/features/orders/hooks"
import { ORDER_STATUS_CONFIG } from "@/features/orders/status"

export function OrderTimeline({ orderId }: { orderId: string }) {
  const timeline = useOrderTimeline(orderId)

  if (timeline.isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }
  if (timeline.isError) return <ErrorState error={timeline.error} onRetry={() => timeline.refetch()} />
  if (!timeline.data || timeline.data.length === 0) return <p className="text-sm text-muted-foreground">Nenhuma atividade registrada ainda para este pedido.</p>

  return (
    <ol className="space-y-3 border-l pl-4">
      {timeline.data.map((entry) => (
        <li key={entry.id} className="relative">
          <span className="absolute top-1.5 -left-[1.1rem] size-2 rounded-full bg-primary" />
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={entry.status} config={ORDER_STATUS_CONFIG} />
            <span className="text-xs text-muted-foreground">{formatDateTime(entry.occurredAt)}</span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {entry.triggeredByUser ? `Por ${entry.triggeredByUser.name}` : "Automático"}
            {entry.notes ? ` — ${entry.notes}` : ""}
          </p>
        </li>
      ))}
    </ol>
  )
}
