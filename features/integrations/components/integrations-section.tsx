"use client"

import * as React from "react"
import { Plug, PlugZap, Loader2, ExternalLink, Copy, Check } from "lucide-react"

import { RefreshCw } from "lucide-react"
import { useCan } from "@/features/auth"
import { useIntegrations, useConnectIntegration, useDisconnectIntegration, useSetIntegrationPaused, useSyncIntegrationNow } from "@/features/integrations/hooks"
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

type PlatformMeta = {
  label: string
  /** Tailwind classes for the icon chip background + icon color */
  chip: string
  /** Brand color used for accents */
  accent: string
  /** Setup guide links */
  portalUrl: string
  devUrl: string
  devLabel: string
  /** Label for the store-id field shown in the connect form */
  fieldLabel: string
  /** Placeholder for the store-id field */
  fieldPlaceholder: string
  /** Helper text explaining where credentials come from (env vars, not the form) */
  fieldHint: string
}

const PLATFORMS: Record<string, PlatformMeta> = {
  IFOOD: {
    label: "iFood",
    chip: "bg-[#ea1d2c]/10",
    accent: "text-[#ea1d2c]",
    portalUrl: "https://portal.ifood.com.br",
    devUrl: "https://developer.ifood.com.br",
    devLabel: "Portal do Desenvolvedor iFood",
    // The app credentials (Client ID/Secret) live in env vars; the field below is just the store id used to route webhooks.
    fieldLabel: "Merchant ID da loja",
    fieldPlaceholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    fieldHint: "ID da sua loja no iFood (visível em Minha conta → Dados do negócio). As credenciais de app (Client ID/Secret) são configuradas pelo administrador do sistema.",
  },
  "99FOOD": {
    label: "99Food",
    chip: "bg-[#ff6a00]/10",
    accent: "text-[#ff6a00]",
    portalUrl: "https://partner.99app.com",
    devUrl: "https://developer.99app.com",
    devLabel: "Portal do Desenvolvedor 99Food",
    fieldLabel: "App Shop ID da loja",
    fieldPlaceholder: "id da loja na 99Food (app_shop_id)",
    fieldHint: "ID da loja dentro do seu app na 99Food (app_shop_id). As credenciais de app (App ID/App Secret) são configuradas pelo administrador do sistema nas variáveis de ambiente.",
  },
  RAPPI: {
    label: "Rappi",
    chip: "bg-[#ff551a]/10",
    accent: "text-[#ff551a]",
    portalUrl: "https://restaurantes.rappi.com",
    devUrl: "https://developers.rappi.com",
    devLabel: "Portal do Desenvolvedor Rappi",
    fieldLabel: "Merchant ID da loja",
    fieldPlaceholder: "id da loja na Rappi",
    fieldHint: "ID da sua loja na Rappi. As credenciais de app são configuradas pelo administrador do sistema.",
  },
  UBER_EATS: {
    label: "Uber Eats",
    chip: "bg-[#06c167]/10",
    accent: "text-[#06c167]",
    portalUrl: "https://restaurant.ubereats.com",
    devUrl: "https://developer.uber.com/docs/eats",
    devLabel: "Portal do Desenvolvedor Uber Eats",
    fieldLabel: "Merchant ID da loja",
    fieldPlaceholder: "id da loja no Uber Eats",
    fieldHint: "ID da sua loja no Uber Eats. As credenciais de app são configuradas pelo administrador do sistema.",
  },
}

/** Platforms the app knows how to render a card for (in display order) */
const SUPPORTED_PLATFORMS = ["IFOOD", "99FOOD", "RAPPI", "UBER_EATS"] as const

const BASE_URL = "https://marginflow-os.vercel.app"

function webhookUrl(platform: string) {
  return `${BASE_URL}/api/webhooks/${platform.toLowerCase()}`
}

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

function SetupGuide({ platform }: { platform: string }) {
  const meta = PLATFORMS[platform]
  if (!meta) return null
  return (
    <div className="rounded-lg border border-dashed p-4 space-y-3 text-sm">
      <p className="font-medium">Como conectar o {meta.label}</p>
      <ol className="list-decimal pl-4 space-y-2 text-muted-foreground">
        <li>
          Acesse o{" "}
          <a
            href={meta.portalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 text-foreground underline underline-offset-2"
          >
            Portal do Parceiro {meta.label}
            <ExternalLink className="size-3" />
          </a>{" "}
          com a conta do seu restaurante.
        </li>
        <li>
          Copie o {meta.fieldLabel ?? "Merchant ID"} exibido lá e cole no campo abaixo.
        </li>
        <li>
          Solicite ao administrador do sistema para registrar o URL de webhook no{" "}
          <a
            href={meta.devUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 text-foreground underline underline-offset-2"
          >
            {meta.devLabel}
            <ExternalLink className="size-3" />
          </a>:
          <div className="mt-1 flex items-center gap-1 rounded-md bg-muted px-2 py-1 font-mono text-xs">
            <span className="flex-1 break-all">{webhookUrl(platform)}</span>
            <CopyButton text={webhookUrl(platform)} />
          </div>
        </li>
      </ol>
      {meta.fieldHint ? <p className="text-xs text-muted-foreground">{meta.fieldHint}</p> : null}
    </div>
  )
}

function IntegrationCard({
  platform,
  integration,
  canManage,
}: {
  platform: string
  integration: MarketplaceIntegration | null
  canManage: boolean
}) {
  const connect = useConnectIntegration()
  const disconnect = useDisconnectIntegration()
  const setPaused = useSetIntegrationPaused()
  const syncNow = useSyncIntegrationNow()
  const [merchantId, setMerchantId] = React.useState("")
  const [showGuide, setShowGuide] = React.useState(false)
  const [confirmOpen, setConfirmOpen] = React.useState(false)

  const meta = PLATFORMS[platform]
  const label = meta?.label ?? platform
  const chip = meta?.chip ?? "bg-muted"
  const accent = meta?.accent ?? "text-foreground"
  const isConnected = integration !== null

  return (
    <div className="rounded-xl border divide-y">
      {/* Header — always visible */}
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <div className={`flex size-10 items-center justify-center rounded-lg ${chip}`}>
            {isConnected ? <Plug className={`size-5 ${accent}`} /> : <PlugZap className={`size-5 ${accent}`} />}
          </div>
          <div>
            <p className="text-sm font-medium">{label}</p>
            {isConnected ? (
              <p className="font-mono text-xs text-muted-foreground">{integration!.merchantId}</p>
            ) : (
              <p className="text-xs text-muted-foreground">Não conectado</p>
            )}
          </div>
        </div>
        {isConnected ? (
          <StatusBadge status={integration!.status} config={INTEGRATION_STATUS_CONFIG} />
        ) : (
          <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium text-muted-foreground">
            Desconectado
          </span>
        )}
      </div>

      {/* Connected state: details */}
      {isConnected && (
        <>
          {integration!.errorMessage ? (
            <div className="px-4 py-3">
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{integration!.errorMessage}</p>
            </div>
          ) : null}

          {integration!.isPaused ? (
            <div className="px-4 py-3">
              <div className="rounded-md bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 px-3 py-2 text-xs text-yellow-800 dark:text-yellow-200">
                Loja pausada no {label} — não está recebendo pedidos.
              </div>
            </div>
          ) : null}

          <div className="px-4 py-3 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">URL do Webhook</p>
            <div className="flex items-center gap-1 rounded-md bg-muted/50 px-2 py-1.5 font-mono text-xs text-muted-foreground">
              <span className="flex-1 break-all">{webhookUrl(platform)}</span>
              <CopyButton text={webhookUrl(platform)} />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <p className="text-xs text-muted-foreground">
              {integration!.lastSyncAt
                ? `Última sincronização: ${formatDateTime(integration!.lastSyncAt)}`
                : "Aguardando primeiro pedido..."}
            </p>
            <div className="flex items-center gap-2">
              {canManage ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={syncNow.isPending}
                  onClick={() => syncNow.mutate(platform)}
                  title={`Buscar eventos ${label} pendentes agora`}
                >
                  {syncNow.isPending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                  Sincronizar
                </Button>
              ) : null}
              {canManage && integration ? (
                <Button
                  variant={integration.isPaused ? "default" : "outline"}
                  size="sm"
                  disabled={setPaused.isPending}
                  onClick={() => setPaused.mutate({ platform, paused: !integration.isPaused })}
                >
                  {setPaused.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  {integration.isPaused ? "Reabrir loja" : "Pausar loja"}
                </Button>
              ) : null}
              {canManage ? (
                <Button variant="outline" size="sm" onClick={() => setConfirmOpen(true)}>
                  Desconectar
                </Button>
              ) : null}
            </div>
          </div>

          <ConfirmDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            title="Desconectar integração"
            description={`Tem certeza que deseja desconectar o ${label}? Os pedidos já importados não serão removidos.`}
            confirmLabel="Desconectar"
            variant="destructive"
            isLoading={disconnect.isPending}
            onConfirm={() => disconnect.mutate(platform, { onSuccess: () => setConfirmOpen(false) })}
          />
        </>
      )}

      {/* Not connected state: setup form */}
      {!isConnected && (
        <div className="px-4 py-3 space-y-3">
          <button
            onClick={() => setShowGuide((s) => !s)}
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground text-left"
          >
            {showGuide ? "Ocultar instruções" : "Como conectar?"}
          </button>

          {showGuide ? <SetupGuide platform={platform} /> : null}

          {canManage ? (
            <div>
              <Label htmlFor={`${platform}-merchant-id`} className="mb-1.5 text-xs">
                {meta?.fieldLabel ?? "Merchant ID do restaurante"}
              </Label>
              <div className="flex gap-2">
                <Input
                  id={`${platform}-merchant-id`}
                  placeholder={meta?.fieldPlaceholder ?? "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"}
                  value={merchantId}
                  onChange={(e) => setMerchantId(e.target.value)}
                  className="font-mono text-xs"
                />
                <Button
                  size="sm"
                  disabled={!merchantId.trim() || connect.isPending}
                  onClick={() => {
                    if (!merchantId.trim()) return
                    connect.mutate({ platform, merchantId: merchantId.trim() }, {
                      onSuccess: () => setMerchantId(""),
                    })
                  }}
                >
                  {connect.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Conectar
                </Button>
              </div>
              {meta?.fieldHint ? (
                <p className="mt-1.5 text-xs text-muted-foreground">{meta.fieldHint}</p>
              ) : null}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Apenas gerentes e proprietários podem conectar integrações.</p>
          )}
        </div>
      )}
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

  const data = integrations.data ?? []
  const connectedByPlatform = new Map(data.map((i) => [i.platform, i]))

  // Show every supported platform; connected ones get their data, others show the setup form.
  const platformsToShow = SUPPORTED_PLATFORMS.filter(
    (p) => connectedByPlatform.has(p) || !data.some((i) => i.platform === p),
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Plataformas de delivery</CardTitle>
        <CardDescription>
          Conecte sua loja a plataformas de delivery para receber pedidos automaticamente no MarginFlow.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {platformsToShow.map((platform) => (
          <IntegrationCard
            key={platform}
            platform={platform}
            integration={connectedByPlatform.get(platform) ?? null}
            canManage={canManage}
          />
        ))}
      </CardContent>
    </Card>
  )
}
