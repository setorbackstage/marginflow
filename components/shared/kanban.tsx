import { cn } from "@/lib/utils"

/** A single column in a status-based kanban board (Kitchen, Delivery, etc). */
export function KanbanColumn({
  title,
  count,
  children,
  className,
}: {
  title: string
  count: number
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex min-w-72 flex-1 flex-col gap-3 rounded-xl bg-muted/30 p-3", className)}>
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-medium">{title}</h3>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground tabular-nums">{count}</span>
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  )
}

export function KanbanCard({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-lg border bg-background p-3 text-sm shadow-sm",
        onClick && "cursor-pointer transition-colors hover:border-primary/40",
        className,
      )}
    >
      {children}
    </div>
  )
}
