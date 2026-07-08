"use client"

import * as React from "react"
import { Plug, PlugZap, Loader2, ExternalLink, Copy, Check } from "lucide-react"

import { useCan } from "@/features/auth"
import { useIntegrations, useConnectIntegration, useDisconnectIntegration } from "@/features/integrations/hooks"
import type { MarketplaceIntegration } from "@/features/integrations/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ErrorState, ConfirmDialog, StatusBadge } from "@/components/shared"
import type { StatusConfig } from "@/components/shared"
import { formatDateTime } from "@/lib/format"

const INTEGRATION_STATUS_CONFIG: Record<string, StatusConfig> = {
  ACTIVE:   { label: "Ativo",   tone: "success" },
  INACTIVE: { label: "Inativo", tone: "neutral" },
  ERROR:    { label: "Erro",    tone: "danger"  },
}

const PLATFORM_LABEL: Record<string, string> = {
  IFOOD: "iFood",
  RAPPI: "Rappi",
  UBER_EATS: "Uber Eats",
}

const WEBHOOK_URL = "https://marginflow-os.vercel.app/api/webhooks/ifood"

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

function IfoodSetupGuide() {
  return (
    <div className="rounded-lg border border-dashed p-4 space-y-3 text-sm">
      <p className="font-medium">Como conectar o iFood</p>
      <ol className="list-decimal pl-4 space-y-2 text-muted-foreground">
        <li>
          Acesse o{" "}
          <a
            href="https://portal.ifood.com.br"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 text-foreground underline underline-offset-2"
          >
            Portal do Parceiro iFood
            <ExternalLink className="size-3" />
          </a>{" "}
          com a conta do seu restaurante.
        </li>
        <li>
          Vá em <strong>Minha conta → Dados do negócio</strong>. O <strong>Merchant ID</strong> é o UUID exibido lá — copie e cole no campo abaixo.
        </li>
        <li>
          Solicite ao administrador do sistema para registrar o URL de webhook no{" "}
          <a
            href="https://developer.ifood.com.br"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 text-foreground underline underline-offset-2"
          >
            Portal do Desenvolvedor iFood
            <ExternalLink className="size-3" />
          </a>
          :
          <div className="mt-1 flex items-center gap-1 rounded-md bg-muted px-2 py-1 font-mono text-xs">
            <span className="flex-1 break-all">{WEBHOOK_URL}</span>
            <CopyButton text={WEBHOOK_URL} />
          </div>
        </li>
      </ol>
    </div>
  )
}

function ConnectIfoodCard({ canManage }: { canManage: boolean }) {
  const connect = useConnectIntegration()
  const [merchantId, setMerchantId] = React.useState("")
  const [showGuide, setShowGuide] = React.useState(false)

  const handleConnect = () => {
    if (!merchantId.trim()) return
    connect.mutate({ platform: "IFOOD", merchantId: merchantId.trim() }, {
      onSuccess: () => setMerchantId(""),
    })
  }

  return (
    <div className="rounded-xl border p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-[#ea1d2c]/10">
          <PlugZap className="size-5 text-[#ea1d2c]" />
        </div>
        <div>
          <p className="text-sm font-medium">iFood</p>
          <p className="text-xs text-muted-foreground">Receba pedidos direto do marketplace</p>
        </div>
      </div>

      <button
        onClick={() => setShowGuide((s) => !s)}
        className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground text-left"
      >
        {showGuide ? "Ocultar instruções" : "Como conectar?"}
      </button>

      {showGuide ? <IfoodSetupGuide /> : null}

      {canManage ? (
        <div className="space-y-2">
          <div>
            <Label htmlFor="ifood-merchant-id" className="mb-1.5 text-xs">
              Merchant ID do restaurante
            </Label>
            <div className="flex gap-2">
              <Input
                id="ifood-merchant-id"
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                value={merchantId}
                onChange={(e) => setMerchantId(e.target.value)}
                className="font-mono text-xs"
              />
              <Button
                size="sm"
                disabled={!merchantId.trim() || connect.isPending}
                onClick={handleConnect}
              >
                {connect.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                Conectar
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Apenas gerentes e proprietários podem conectar integrações.</p>
      )}
    </div>
  )
}

function ConnectedIntegrationCard({
  integration,
  canManage,
}: {
  integration: MarketplaceIntegration
  canManage: boolean
}) {
  const disconnect = useDisconnectIntegration()
  const [confirmOpen, setConfirmOpen] = React.useState(false)

  return (
    <div className="rounded-xl border p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-[#ea1d2c]/10">
            <Plug className="size-5 text-[#ea1d2c]" />
          </div>
          <div>
            <p className="text-sm font-medium">{PLATFORM_LABEL[integration.platform] ?? integration.platform}</p>
            <p className="font-mono text-xs text-muted-foreground">{integration.merchantId}</p>
          </div>
        </div>
        <StatusBadge status={integration.status} config={INTEGRATION_STATUS_CONFIG} />
      </div>

      {integration.errorMessage ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{integration.errorMessage}</p>
      ) : null}

      <div className="rounded-md bg-muted/50 px-3 py-2 space-y-1">
        <p className="text-xs font-medium">URL do Webhook (configure no Portal do Desenvolvedor iFood)</p>
        <div className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
          <span className="flex-1 break-all">{WEBHOOK_URL}</span>
          <CopyButton text={WEBHOOK_URL} />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {integration.lastSyncAt
            ? `Última sincronização: ${formatDateTime(integration.lastSyncAt)}`
            : "Aguardando primeiro pedido..."}
        </p>
        {canManage ? (
          <Button variant="outline" size="sm" onClick={() => setConfirmOpen(true)}>
            Desconectar
          </Button>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Desconectar integração"
        description={`Tem certeza que deseja desconectar o ${PLATFORM_LABEL[integration.platform] ?? integration.platform}? Os pedidos já importados não serão removidos.`}
        confirmLabel="Desconectar"
        variant="destructive"
        isLoading={disconnect.isPending}
        onConfirm={() => disconnect.mutate(integration.platform, { onSuccess: () => setConfirmOpen(false) })}
      />
    </div>
  )
}

export function IntegrationsSection() {
  const canView = useCan("integrations:view")
  const canManage = useCan("integrations:manage")
  const integrations = useIntegrations()

  if (!canView) return null

  if (integrations.isLoading) return <Skeleton className="h-48 w-full" />
  if (integrations.isError) return <ErrorState error={integrations.error} onRetry={() => integrations.refetch()} />

  const ifoodIntegration = integrations.data?.find((i) => i.platform === "IFOOD")

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Marketplaces</CardTitle>
        <CardDescription>
          Conecte sua loja a plataformas de delivery para receber pedidos automaticamente no MarginFlow.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {ifoodIntegration ? (
          <ConnectedIntegrationCard integration={ifoodIntegration} canManage={canManage} />
        ) : (
          <ConnectIfoodCard canManage={canManage} />
        )}
      </CardContent>
    </Card>
  )
}
