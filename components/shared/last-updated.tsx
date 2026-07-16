"use client"

import * as React from "react"
import { RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

interface LastUpdatedProps {
  dataUpdatedAt: number  // from React Query's query.dataUpdatedAt
  isFetching: boolean
  className?: string
}

export function LastUpdated({ dataUpdatedAt, isFetching, className }: LastUpdatedProps) {
  const [label, setLabel] = React.useState("")

  React.useEffect(() => {
    function update() {
      if (!dataUpdatedAt) { setLabel(""); return }
      const diffSec = Math.floor((Date.now() - dataUpdatedAt) / 1000)
      if (diffSec < 10) setLabel("Agora")
      else if (diffSec < 60) setLabel(`há ${diffSec}s`)
      else if (diffSec < 3600) setLabel(`há ${Math.floor(diffSec / 60)} min`)
      else setLabel(`há ${Math.floor(diffSec / 3600)}h`)
    }
    update()
    const id = setInterval(update, 30_000)
    return () => clearInterval(id)
  }, [dataUpdatedAt])

  if (!dataUpdatedAt && !isFetching) return null

  return (
    <span className={cn("flex items-center gap-1 text-xs text-muted-foreground", className)}>
      <RefreshCw className={cn("size-3", isFetching && "animate-spin")} />
      {isFetching ? "Atualizando..." : label}
    </span>
  )
}
