"use client"

import { Loader2, X } from "lucide-react"

import { Button } from "@/components/ui/button"

/**
 * Sticky save bar for settings forms.
 * Appears (fixed, bottom of viewport) only when there are unsaved changes.
 */
export function SettingsSaveBar({
  isDirty,
  isPending,
  onSave,
  onDiscard,
}: {
  isDirty: boolean
  isPending?: boolean
  onSave: () => void
  onDiscard: () => void
}) {
  if (!isDirty) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4 md:pl-[15rem]">
      <div className="flex w-full max-w-2xl items-center justify-between gap-3 rounded-xl border bg-background/95 px-4 py-2.5 shadow-lg backdrop-blur-sm">
        <p className="text-sm text-muted-foreground">
          Você tem alterações não salvas
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={onDiscard}
          >
            <X data-icon="inline-start" />
            Descartar
          </Button>
          <Button type="button" size="sm" disabled={isPending} onClick={onSave}>
            {isPending ? <Loader2 className="animate-spin" /> : null}
            Salvar alterações
          </Button>
        </div>
      </div>
    </div>
  )
}
