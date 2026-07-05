import { Hammer } from "lucide-react"
import { PageHeader } from "@/components/app-shell/page-container"

/**
 * Interim page body for routes whose backend wiring is scheduled for a later
 * build cycle. Keeps the shell fully navigable (no 404s) without shipping fake
 * data — it explicitly states the area is not yet connected.
 */
export function FeaturePlaceholder({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={title} description={description} />
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-20 text-center">
        <div className="flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <Hammer className="size-5" />
        </div>
        <p className="text-sm font-medium">Em construção</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Esta área será conectada ao backend em um próximo ciclo.
        </p>
      </div>
    </div>
  )
}
