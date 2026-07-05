import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type BadgeTone = "neutral" | "info" | "warning" | "success" | "danger"

const TONE_CLASS: Record<BadgeTone, string> = {
  neutral: "bg-muted text-muted-foreground",
  info: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  danger: "bg-destructive/10 text-destructive",
}

export interface StatusConfig {
  label: string
  tone: BadgeTone
}

/**
 * Renders a status string as a colored badge using a domain-specific config
 * map (see `*-status.ts` per feature). Falls back to the raw status value so
 * an unmapped status is still visible instead of silently disappearing.
 */
export function StatusBadge({ status, config, className }: { status: string; config: Record<string, StatusConfig>; className?: string }) {
  const entry = config[status]
  return (
    <Badge variant="outline" className={cn("border-transparent", TONE_CLASS[entry?.tone ?? "neutral"], className)}>
      {entry?.label ?? status}
    </Badge>
  )
}
