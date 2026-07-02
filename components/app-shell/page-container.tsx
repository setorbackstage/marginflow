import * as React from "react"

import { cn } from "@/lib/utils"

export function PageContainer({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div
        className={cn(
          "mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8",
          className
        )}
      >
        {children}
      </div>
    </div>
  )
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">
          {title}
        </h1>
        {description ? (
          <p className="text-sm text-muted-foreground text-pretty">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  )
}
