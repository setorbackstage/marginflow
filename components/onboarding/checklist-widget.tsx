"use client"

import * as React from "react"
import { CheckCircle2, Circle, ChevronUp, ChevronDown, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useChecklist, useOnboardingSettings, useCompleteOnboarding } from "@/features/onboarding"

export function ChecklistWidget() {
  const router = useRouter()
  const { settings, isLoading } = useOnboardingSettings()
  const checklist = useChecklist()
  const completeOnboarding = useCompleteOnboarding()
  const [expanded, setExpanded] = React.useState(true)

  // Hide widget after onboarding is fully complete
  if (isLoading || settings.completedAt) return null

  const done = checklist.filter((item) => item.completed).length
  const total = checklist.length
  const percent = Math.round((done / total) * 100)

  return (
    <div className="border-t border-border px-2 py-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
      >
        <span>Configuração inicial</span>
        {expanded ? <ChevronDown className="size-3" /> : <ChevronUp className="size-3" />}
      </button>

      {expanded && (
        <>
          <div className="mb-2 mt-1 px-2">
            <div className="mb-1 flex justify-between text-[10px] text-muted-foreground">
              <span>{done} de {total} concluídos</span>
              <span>{percent}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto">
            {checklist.map((item) => (
              <button
                key={item.id}
                onClick={() => router.push(item.href)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted/50"
              >
                {item.isLoading ? (
                  <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
                ) : item.completed ? (
                  <CheckCircle2 className="size-3.5 shrink-0 text-primary" />
                ) : (
                  <Circle className="size-3.5 shrink-0 text-muted-foreground" />
                )}
                <span className={`text-xs ${item.completed ? "text-muted-foreground line-through" : ""}`}>
                  {item.label}
                </span>
              </button>
            ))}
          </div>

          {done === total - 1 && !settings.completedAt && (
            <div className="mt-2 px-2">
              <Button
                size="sm"
                className="w-full text-xs h-7"
                onClick={() => completeOnboarding()}
              >
                Concluir onboarding
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
