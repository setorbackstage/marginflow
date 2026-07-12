"use client"

import * as React from "react"
import { Bell, CheckCheck, Loader2, ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { useNotifications, useMarkAllRead, useMarkRead } from "@/features/notifications"

export function Notifications() {
  const router = useRouter()
  const notifications = useNotifications({ limit: 10 })
  const markAllRead = useMarkAllRead()
  const markRead = useMarkRead()

  const unread = notifications.data?.unread ?? 0
  const items = notifications.data?.items ?? []

  function handleItemClick(link: string | null, id: string) {
    markRead.mutate(id)
    if (link) router.push(link)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Notificações${unread ? `, ${unread} não lidas` : ""}`}
            className="relative"
          />
        }
      >
        <Bell />
        {unread > 0 ? (
          <span className="absolute right-1 top-1 size-1.5 rounded-full bg-primary ring-2 ring-background" />
        ) : null}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={8} className="w-80 rounded-lg">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center justify-between text-sm font-medium text-foreground">
            <span>Notificações</span>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <span className="text-xs font-normal text-muted-foreground">
                  {unread} não lida{unread !== 1 ? "s" : ""}
                </span>
              )}
              {unread > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={(e) => {
                    e.preventDefault()
                    markAllRead.mutate()
                  }}
                  disabled={markAllRead.isPending}
                >
                  {markAllRead.isPending ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <CheckCheck className="size-3" />
                  )}
                  <span className="ml-1">Ler tudo</span>
                </Button>
              )}
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />

        {notifications.isLoading ? (
          <div className="space-y-1 p-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-2 p-2">
                <Skeleton className="mt-1 size-1.5 shrink-0 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.isError ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            Erro ao carregar notificações
          </div>
        ) : items.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            Nenhuma notificação
          </div>
        ) : (
          items.map((item) => (
            <DropdownMenuItem
              key={item.id}
              className="flex flex-col items-start gap-0.5 p-2.5"
              onClick={() => handleItemClick(item.link, item.id)}
            >
              <div className="flex w-full items-center gap-2">
                {!item.readAt ? (
                  <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                ) : (
                  <span className="size-1.5 shrink-0 rounded-full bg-transparent" />
                )}
                <span className="flex-1 truncate text-sm font-medium">{item.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(item.createdAt), { locale: ptBR, addSuffix: true })}
                </span>
              </div>
              <span className="pl-3.5 text-xs text-muted-foreground line-clamp-1">{item.body}</span>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="justify-center text-xs text-muted-foreground"
          onClick={() => router.push("/notifications")}
        >
          Ver todas
          <ArrowRight className="ml-1 size-3" />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
