"use client"

import * as React from "react"
import QRCode from "qrcode"
import { Copy, Check, Download, ExternalLink } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Sprint 2 "Compartilhamento" + "QR Code" — the public menu's share panel,
 * shown in Configurações. URL is path-based (`/r/:slug`) on the app's own
 * origin today; the sprint explicitly says not to implement a custom-domain
 * feature yet, only to "prepare the architecture" for one — using
 * `window.location.origin` here (rather than hardcoding a host) is that
 * preparation: swapping in a per-store custom domain later only means
 * changing this one computed value, not the sharing/QR mechanism itself.
 */
const noopSubscribe = () => () => {}

export function SharePanel({ slug }: { slug: string }) {
  // `window.location.origin` never changes without a full navigation — a
  // `useSyncExternalStore` with a no-op subscribe reads it SSR-safely
  // (server snapshot `null`) without the setState-in-effect anti-pattern.
  const origin = React.useSyncExternalStore(
    noopSubscribe,
    () => window.location.origin,
    () => null,
  )
  const [qrDataUrl, setQrDataUrl] = React.useState<string | null>(null)
  const [copied, setCopied] = React.useState(false)

  const url = origin ? `${origin}/r/${slug}` : null

  React.useEffect(() => {
    if (!url) return
    QRCode.toDataURL(url, { width: 480, margin: 2 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null))
  }, [url])

  const copyUrl = async () => {
    if (!url) return
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const downloadQr = () => {
    if (!qrDataUrl) return
    const a = document.createElement("a")
    a.href = qrDataUrl
    a.download = `cardapio-${slug}-qrcode.png`
    a.click()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cardápio online</CardTitle>
        <CardDescription>
          Compartilhe o link ou imprima o QR Code para os clientes acessarem o
          cardápio direto do celular.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Link público
            </label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={url ?? "Carregando…"}
                className="font-mono text-xs"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={copyUrl}
                disabled={!url}
                aria-label="Copiar link"
              >
                {copied ? (
                  <Check className="size-4" />
                ) : (
                  <Copy className="size-4" />
                )}
              </Button>
              {url ? (
                <Button
                  variant="outline"
                  size="icon"
                  nativeButton={false}
                  render={
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Abrir cardápio"
                    />
                  }
                >
                  <ExternalLink className="size-4" />
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-lg border p-4">
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- data: URL, next/image can't optimize it and doesn't need to.
            <img
              src={qrDataUrl}
              alt="QR Code do cardápio"
              className="size-28 shrink-0 rounded-md border bg-white p-1.5"
            />
          ) : (
            <Skeleton className="size-28 shrink-0 rounded-md" />
          )}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Aponta direto para o cardápio público — ideal para mesas,
              embalagens e vitrine.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadQr}
              disabled={!qrDataUrl}
            >
              <Download data-icon="inline-start" />
              Baixar QR Code
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
