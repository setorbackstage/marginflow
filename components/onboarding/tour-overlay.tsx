"use client"

import * as React from "react"
import { X, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { TourStep } from "@/features/onboarding/types"

interface TourOverlayProps {
  steps: TourStep[]
  onComplete: () => void
  onSkip: () => void
}

interface ElementRect {
  top: number
  left: number
  width: number
  height: number
}

const PADDING = 8

export function TourOverlay({ steps, onComplete, onSkip }: TourOverlayProps) {
  const [stepIndex, setStepIndex] = React.useState(0)
  const [rect, setRect] = React.useState<ElementRect | null>(null)
  const step = steps[stepIndex]

  React.useEffect(() => {
    const el = document.querySelector(step.selector)
    el?.scrollIntoView({ behavior: "smooth", block: "center" })
    // Defer measurement to next frame so we read post-scroll layout
    const id = requestAnimationFrame(() => {
      const r = el?.getBoundingClientRect() ?? null
      setRect(r ? { top: r.top, left: r.left, width: r.width, height: r.height } : null)
    })
    return () => cancelAnimationFrame(id)
  }, [stepIndex, step.selector])

  function next() {
    if (stepIndex < steps.length - 1) setStepIndex(stepIndex + 1)
    else onComplete()
  }

  function prev() {
    if (stepIndex > 0) setStepIndex(stepIndex - 1)
  }

  const tooltipWidth = 280
  const tooltipTop = rect
    ? rect.top + rect.height + PADDING + 16 < window.innerHeight - 120
      ? rect.top + rect.height + PADDING + 8
      : rect.top - 120 - PADDING
    : window.innerHeight / 2 - 60
  const tooltipLeft = rect
    ? Math.max(8, Math.min(rect.left + rect.width / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - 8))
    : window.innerWidth / 2 - tooltipWidth / 2

  return (
    <div className="fixed inset-0 z-[9999]">
      {/* Dark overlay with spotlight cutout using box-shadow */}
      {rect ? (
        <div
          className="pointer-events-none fixed rounded"
          style={{
            top: rect.top - PADDING,
            left: rect.left - PADDING,
            width: rect.width + PADDING * 2,
            height: rect.height + PADDING * 2,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.65)",
            zIndex: 9999,
          }}
        />
      ) : (
        <div className="pointer-events-none fixed inset-0 bg-black/65" style={{ zIndex: 9999 }} />
      )}

      {/* Tooltip card */}
      <div
        className="fixed z-[10000] rounded-lg border bg-background p-4 shadow-xl"
        style={{ top: tooltipTop, left: tooltipLeft, width: tooltipWidth }}
      >
        {/* Step counter + close */}
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {stepIndex + 1} / {steps.length}
          </span>
          <button onClick={onSkip} className="text-muted-foreground hover:text-foreground">
            <X className="size-3.5" />
          </button>
        </div>

        <h3 className="mb-1 text-sm font-semibold">{step.title}</h3>
        <p className="mb-4 text-xs text-muted-foreground leading-relaxed">{step.content}</p>

        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onSkip} className="text-xs h-7 px-2">
            Pular tour
          </Button>
          <div className="flex gap-1.5">
            {stepIndex > 0 && (
              <Button variant="outline" size="sm" onClick={prev} className="h-7 px-2">
                <ChevronLeft className="size-3.5" />
              </Button>
            )}
            <Button size="sm" onClick={next} className="h-7 px-3 text-xs">
              {stepIndex < steps.length - 1 ? (
                <>
                  <span>Próximo</span>
                  <ChevronRight className="ml-1 size-3.5" />
                </>
              ) : (
                "Concluir"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
