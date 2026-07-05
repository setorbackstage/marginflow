import { Sparkles } from "lucide-react"
import { PageHeader } from "@/components/app-shell/page-container"
import { Badge } from "@/components/ui/badge"

const REASON_COPY: Record<"pending-api" | "out-of-scope", string> = {
  "pending-api":
    "ainda não está disponível nesta versão do MarginFlow OS. Assim que a API correspondente for publicada, este módulo será ativado automaticamente.",
  "out-of-scope": "é uma ferramenta interna de referência, fora do escopo operacional deste MVP.",
}

/**
 * Body for nav routes with no functional screen behind them yet (CRM,
 * Reports, Integrations have no backend surface at all; Design System is an
 * internal dev reference intentionally left out of the MVP scope).
 * Deliberately not a functional screen — this states that plainly instead of
 * shipping fake data or dead buttons, styled as a real "on the roadmap"
 * product state rather than a scaffolding placeholder.
 */
export function FeaturePlaceholder({
  title,
  description,
  reason = "pending-api",
}: {
  title: string
  description?: string
  reason?: "pending-api" | "out-of-scope"
}) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={title} description={description} actions={<Badge variant="secondary">Em breve</Badge>} />
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed py-24 text-center">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Sparkles className="size-5" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">Módulo em desenvolvimento</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {title} {REASON_COPY[reason]}
          </p>
        </div>
      </div>
    </div>
  )
}
