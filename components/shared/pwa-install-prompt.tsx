"use client"

import * as React from "react"
import { X, Download } from "lucide-react"
import { Button } from "@/components/ui/button"

// ---------------------------------------------------------------------------
// BeforeInstallPromptEvent — não tipado pelo TypeScript padrão.
// ---------------------------------------------------------------------------

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

const DISMISSED_KEY = "mf_pwa_install_dismissed"

/**
 * Captura o evento `beforeinstallprompt` (Chrome/Edge/Android) e exibe um
 * banner discreto convidando o usuário a instalar o app na tela inicial.
 *
 * Em iOS não existe `beforeinstallprompt` — o banner não aparece lá,
 * mas a instalação funciona via "Adicionar à Tela Inicial" no Safari
 * graças aos meta tags `apple-mobile-web-app-*` no layout.
 */
export function PwaInstallPrompt() {
  const [prompt, setPrompt] = React.useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = React.useState(false)

  React.useEffect(() => {
    // Não mostra se já foi dispensado ou se o app já está instalado (standalone).
    if (
      localStorage.getItem(DISMISSED_KEY) === "1" ||
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error — navigator.standalone é propriedade iOS
      window.navigator.standalone === true
    ) {
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setPrompt(e as BeforeInstallPromptEvent)
      setVisible(true)
    }

    window.addEventListener("beforeinstallprompt", handler)
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  async function handleInstall() {
    if (!prompt) return
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === "accepted") {
      setVisible(false)
      setPrompt(null)
    }
  }

  function handleDismiss() {
    setVisible(false)
    setPrompt(null)
    localStorage.setItem(DISMISSED_KEY, "1")
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-sm items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-lg">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary">
          <Download className="size-4 text-primary-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight">Instalar MarginFlow OS</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Adicione à tela inicial para acesso rápido</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button size="sm" onClick={handleInstall} className="h-7 px-3 text-xs">
            Instalar
          </Button>
          <Button size="icon" variant="ghost" className="size-7" onClick={handleDismiss} aria-label="Fechar">
            <X className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
