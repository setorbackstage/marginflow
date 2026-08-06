"use client"

import * as React from "react"
import { Webhook, Loader2, Copy, Check, Plus, Trash2 } from "lucide-react"

import { useCan } from "@/features/auth"
import { useWebhooks, useCreateWebhook, useDeleteWebhook } from "@/features/webhooks"
import type { WebhookEndpoint, WebhookCreateResult } from "@/features/webhooks"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ErrorState, ConfirmDialog } from "@/components/shared"
import { formatDateTime } from "@/lib/format"

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      onClick={copy}
      className="ml-1 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      aria-label="Copiar"
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      {copied ? "Copiado" : "Copiar"}
    </button>
  )
}

function SecretReveal({ secret }: { secret: string }) {
  return (
    <div className="rounded-md bg-muted px-2 py-1.5 font-mono text-xs break-all">
      <span className="flex-1">{secret}</span>
      <CopyButton text={secret} />
    </div>
  )
}

function WebhookCard({
  endpoint,
  canManage,
}: {
  endpoint: WebhookEndpoint
  canManage: boolean
}) {
  const del = useDeleteWebhook()
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const eventsLabel =
    endpoint.events.length === 0 || endpoint.events.includes("*")
      ? "Todos os eventos"
      : endpoint.events.join(", ")

  return (
    <div className="rounded-xl border divide-y">
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
            <Webhook className="size-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{endpoint.url}</p>
            <p className="text-xs text-muted-foreground">
              {endpoint.isActive ? "Ativo" : "Inativo"} · {eventsLabel}
            </p>
          </div>
        </div>
        {canManage ? (
          <Button variant="outline" size="sm" onClick={() => setConfirmOpen(true)}>
            <Trash2 className="size-4" />
          </Button>
        ) : null}
      </div>
      <div className="px-4 py-2">
        <p className="text-xs text-muted-foreground">
          Criado em {formatDateTime(endpoint.createdAt)}
        </p>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Excluir webhook"
        description="Tem certeza que deseja remover este endpoint? Os eventos deixarão de ser enviados para ele."
        confirmLabel="Excluir"
        variant="destructive"
        isLoading={del.isPending}
        onConfirm={() => del.mutate(endpoint.id, { onSuccess: () => setConfirmOpen(false) })}
      />
    </div>
  )
}

function CreateDialog({
  supportedEvents,
  canManage,
}: {
  supportedEvents: string[]
  canManage: boolean
}) {
  const create = useCreateWebhook()
  const [open, setOpen] = React.useState(false)
  const [url, setUrl] = React.useState("")
  const [all, setAll] = React.useState(true)
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [created, setCreated] = React.useState<WebhookCreateResult | null>(null)

  const reset = () => {
    setUrl("")
    setAll(true)
    setSelected(new Set())
    setCreated(null)
  }

  const toggle = (ev: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(ev)) next.delete(ev)
      else next.add(ev)
      return next
    })
  }

  const submit = () => {
    if (!url.trim()) return
    const events = all ? [] : Array.from(selected)
    create.mutate(
      { url: url.trim(), events },
      {
        onSuccess: (res) => {
          setCreated(res)
          setUrl("")
          setAll(true)
          setSelected(new Set())
        },
      },
    )
  }

  if (!canManage) return null

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Novo webhook
      </Button>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset() }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo webhook de saída</DialogTitle>
            <DialogDescription>
              O MarginFlow envia um POST assinado (HMAC-SHA256) para a URL abaixo sempre que
              um evento ocorrer.
            </DialogDescription>
          </DialogHeader>

          {created ? (
            <div className="space-y-3">
              <p className="text-sm font-medium">Webhook criado!</p>
              <p className="text-xs text-muted-foreground">
                Copie o segredo agora — ele não será exibido novamente:
              </p>
              <SecretReveal secret={created.secret} />
              <Button
                className="w-full"
                onClick={() => { setOpen(false); reset() }}
              >
                Concluir
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="wh-url">URL de destino (HTTPS)</Label>
                <Input
                  id="wh-url"
                  placeholder="https://seu-sistema.com/webhook"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label>Eventos</Label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={all}
                    onChange={(e) => setAll(e.target.checked)}
                  />
                  Todos os eventos
                </label>
                {!all &&
                  supportedEvents.map((ev) => (
                    <label key={ev} className="flex items-center gap-2 text-sm pl-5">
                      <input
                        type="checkbox"
                        checked={selected.has(ev)}
                        onChange={() => toggle(ev)}
                      />
                      <span className="font-mono text-xs">{ev}</span>
                    </label>
                  ))}
              </div>

              {create.isError ? (
                <p className="text-xs text-destructive">
                  Não foi possível criar o webhook. Verifique a URL (deve ser HTTPS).
                </p>
              ) : null}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setOpen(false); reset() }}>
                  Cancelar
                </Button>
                <Button disabled={!url.trim() || create.isPending} onClick={submit}>
                  {create.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Criar webhook
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

export function WebhooksSection() {
  const canView = useCan("integrations:view")
  const canManage = useCan("integrations:manage")
  const webhooks = useWebhooks()

  if (!canView) return null
  if (webhooks.isLoading) return <Skeleton className="h-48 w-full" />
  if (webhooks.isError)
    return <ErrorState error={webhooks.error} onRetry={() => webhooks.refetch()} />

  const endpoints = webhooks.data?.data ?? []
  const supportedEvents = webhooks.data?.meta.supportedEvents ?? []

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm">Webhooks de saída</CardTitle>
            <CardDescription>
              Receba eventos do MarginFlow (pedidos, pagamentos, entregas) em sistemas externos
              via POST assinado.
            </CardDescription>
          </div>
          <CreateDialog supportedEvents={supportedEvents} canManage={canManage} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {endpoints.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum webhook configurado. Crie um para integrar o MarginFlow a outros sistemas.
          </p>
        ) : (
          endpoints.map((ep) => (
            <WebhookCard key={ep.id} endpoint={ep} canManage={canManage} />
          ))
        )}
      </CardContent>
    </Card>
  )
}
