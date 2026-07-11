"use client"

import * as React from "react"
import { WifiOff } from "lucide-react"

export function OfflineBanner() {
  const [isOnline, setIsOnline] = React.useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true,
  )

  React.useEffect(() => {
    const onOnline = () => setIsOnline(true)
    const onOffline = () => setIsOnline(false)
    window.addEventListener("online", onOnline)
    window.addEventListener("offline", onOffline)
    return () => {
      window.removeEventListener("online", onOnline)
      window.removeEventListener("offline", onOffline)
    }
  }, [])

  if (isOnline) return null

  return (
    <div className="flex items-center gap-2 border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
      <WifiOff className="size-4 shrink-0" />
      <span>Sem conexão com a internet. Verifique sua rede e tente novamente.</span>
    </div>
  )
}
