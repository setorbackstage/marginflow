"use client"

import * as React from "react"

/**
 * Registra o service worker (/sw.js) independentemente do suporte a Web Push.
 * O SW gerencia cache offline e fallback — deve rodar em todos os browsers
 * que suportam ServiceWorker, mesmo que VAPID não esteja configurado.
 */
export function useServiceWorker() {
  React.useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return

    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Falha silenciosa — o app funciona normalmente sem SW.
    })
  }, [])
}
