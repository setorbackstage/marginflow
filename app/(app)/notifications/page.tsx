"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Bell, BellOff, BellRing, Trash2, CheckCheck, Loader2, ShieldAlert } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"

import {
  useNotifications, useMarkAllRead, useMarkRead, useDeleteNotification, usePushNotifications,
} from "@/features/notifications"
import { PageHeader } from "@/components/app-shell/page-container"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState, ErrorState, PaginationBar } from "@/components/shared"
import { cn } from "@/lib/utils"
import type { Notification } from "@/features/notifications/types"

// ─── Notification type colour dot ────────────────────────────────────────────

const TYPE_COLOR: Record<string, string> = {
  NEW_ORDER:         "bg-emerald-500",
  ORDER_CANCELLED:   "bg-destructive",
  PAYMENT_RECEIVED:  "bg-emerald-500",
  PAYMENT_REFUNDED:  "bg-amber-500",
  DELIVERY_FAILED:   "bg-destructive",
  STOCK_LOW:         "bg-amber-500",
  KITCHEN_READY:     "bg-sky-500",
  SYSTEM:            "bg-violet-500",
}

const TYPE_LABEL: Record<string, string> = {
  NEW_ORDER:         "Novo pedido",
  ORDER_CANCELLED:   "Pedido cancelado",
  PAYMENT_RECEIVED:  "Pagamento",
  PAYMENT_REFUNDED:  "Reembolso",
  DELIVERY_FAILED:   "Entrega falhou",
  STOCK_LOW:         "Estoque baixo",
  KITCHEN_READY:     "Cozinha",
  SYSTEM:            "Sistema",
}

// ─── Push subscription panel ─────────────────────────────────────────────────

function PushPanel() {
  const { state, subscribe, unsubscribe, isSupported } = usePushNotifications()

  if (!isSupported) {
    return (
      <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
        <BellOff className="size-4 shrink-0" />
        <span>Notificações push não disponíveis neste navegador ou chaves VAPID não configuradas.</span>
      </div>
    )
  }

  if (state === "denied") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
        <ShieldAlert className="size-4 shrink-0 text-destructive" />
        <span>Permissão de notificação bloqueada pelo navegador. Altere nas configurações do site para reativar.</span>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border bg-background p-4">
      <div className="flex items-center gap-3">
        {state === "granted" ? (
          <BellRing className="size-5 shrink-0 text-emerald-500" />
        ) : (
          <Bell className="size-5 shrink-0 text-muted-foreground" />
        )}
        <div>
          <p className="text-sm font-medium">
            {state === "granted" ? "Notificações push ativas" : "Notificações push desativadas"}
          </p>
          <p className="text-xs text-muted-foreground">
            {state === "granted"
              ? "Você receberá alertas mesmo com a aba em segundo plano."
              : "Ative para receber pedidos novos e alertas fora do sistema."}
          </p>
        </div>
      </div>
      {state === "granted" || state === "unsubscribing" ? (
        <Button
          variant="outline"
          size="sm"
          onClick={unsubscribe}
          disabled={state === "unsubscribing"}
        >
          {state === "unsubscribing" ? <Loader2 className="size-3.5 animate-spin" /> : <BellOff className="size-3.5" />}
          <span className="ml-1.5">Desativar</span>
        </Button>
      ) : (
        <Button
          size="sm"
          onClick={subscribe}
          disabled={state === "subscribing"}
        >
          {state === "subscribing" ? <Loader2 className="size-3.5 animate-spin" /> : <BellRing className="size-3.5" />}
          <span className="ml-1.5">Ativar push</span>
        </Button>
      )}
    </div>
  )
}

// ─── Notification row ─────────────────────────────────────────────────────────

function NotificationRow({ item }: { item: Notification }) {
  const router     = useRouter()
  const markRead   = useMarkRead()
  const deleteNote = useDeleteNotification()

  function handleClick() {
    if (!item.readAt) markRead.mutate(item.id)
    if (item.link) router.push(item.link)
  }

  return (
    <div
      className={cn(
        "group flex items-start gap-3 rounded-xl border p-4 transition-colors",
        item.link && "cursor-pointer hover:bg-muted/30",
        !item.readAt && "border-primary/20 bg-primary/5",
      )}
      onClick={item.link ? handleClick : undefined}
    >
      <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", TYPE_COLOR[item.type] ?? "bg-muted-foreground")} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">{TYPE_LABEL[item.type] ?? item.type}</Badge>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(item.createdAt), { locale: ptBR, addSuffix: true })}
          </span>
          {!item.readAt && <span className="size-1.5 rounded-full bg-primary" />}
        </div>
        <p className="mt-1 text-sm font-medium">{item.title}</p>
        <p className="text-xs text-muted-foreground">{item.body}</p>
      </div>
      <div
        className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={(e) => e.stopPropagation()}
      >
        {!item.readAt && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Marcar como lida"
            disabled={markRead.isPending}
            onClick={() => markRead.mutate(item.id)}
          >
            <CheckCheck className="size-3.5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Excluir"
          disabled={deleteNote.isPending}
          onClick={() => deleteNote.mutate(item.id)}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const [page, setPage] = React.useState(1)
  const notifications = useNotifications({ page, limit: 30 })
  const markAllRead   = useMarkAllRead()

  const items    = notifications.data?.items ?? []
  const unread   = notifications.data?.unread ?? 0
  const pagination = notifications.data?.pagination

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Notificações"
        description="Histórico de alertas e eventos da loja."
        actions={
          unread > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              {markAllRead.isPending ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <CheckCheck data-icon="inline-start" />}
              Marcar tudo como lido
            </Button>
          ) : undefined
        }
      />

      <PushPanel />

      {notifications.isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : notifications.isError ? (
        <ErrorState error={notifications.error} onRetry={() => notifications.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Nenhuma notificação"
          description="Novos pedidos, pagamentos e alertas aparecerão aqui."
        />
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {items.map((item) => <NotificationRow key={item.id} item={item} />)}
          </div>
          {pagination && <PaginationBar pagination={pagination} onPageChange={setPage} />}
        </>
      )}
    </div>
  )
}
