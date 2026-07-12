"use client"

import * as React from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { cn } from "@/lib/utils"

// ─── Basic column and card (no DnD) ─────────────────────────────────────────

/** A single column in a status-based kanban board. */
export function KanbanColumn({
  title,
  count,
  children,
  className,
  droppableId,
  accentColor,
}: {
  title: string
  count: number
  children: React.ReactNode
  className?: string
  /** When provided, the column becomes a drop target. */
  droppableId?: string
  /** Optional left-border accent color class (e.g. "border-l-orange-400"). */
  accentColor?: string
}) {
  const { setNodeRef, isOver } = useDroppable({ id: droppableId ?? "__no-drop__", disabled: !droppableId })

  return (
    <div
      ref={droppableId ? setNodeRef : undefined}
      className={cn(
        "flex min-w-72 flex-1 flex-col gap-3 rounded-xl bg-muted/30 p-3 transition-colors",
        droppableId && isOver && "bg-primary/5 ring-2 ring-primary/20",
        accentColor && `border-l-4 ${accentColor}`,
        className,
      )}
    >
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground tabular-nums">{count}</span>
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  )
}

export function KanbanCard({
  children,
  className,
  onClick,
  draggableId,
  draggableData,
}: {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  /** When provided, the card becomes draggable. */
  draggableId?: string
  /** Metadata passed to drag events (e.g. current status). */
  draggableData?: Record<string, unknown>
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: draggableId ?? "__no-drag__",
    disabled: !draggableId,
    data: draggableData,
  })

  const style = draggableId
    ? {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.4 : undefined,
        cursor: isDragging ? "grabbing" : "grab",
      }
    : undefined

  return (
    <div
      ref={draggableId ? setNodeRef : undefined}
      style={style}
      onClick={onClick}
      {...(draggableId ? { ...listeners, ...attributes } : {})}
      className={cn(
        "rounded-lg border bg-background p-3 text-sm shadow-sm select-none",
        onClick && "transition-colors hover:border-primary/40",
        isDragging && "shadow-lg",
        className,
      )}
    >
      {children}
    </div>
  )
}

// ─── DnD-aware Kanban board wrapper ─────────────────────────────────────────

/**
 * Wraps a kanban board with DnD context. Cards dragged into a column trigger
 * `onCardDrop(cardId, newColumnId)`. Renders a drag overlay while dragging.
 */
export function KanbanBoard({
  children,
  onCardDrop,
  renderOverlay,
}: {
  children: React.ReactNode
  /** Called when a card is dropped in a new column. */
  onCardDrop: (cardId: string, newColumnId: string) => void
  /** Optional: render the drag ghost. Receives the active card id. */
  renderOverlay?: (cardId: string) => React.ReactNode
}) {
  const [activeId, setActiveId] = React.useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Require 8px of movement before starting a drag to prevent accidental drags
      activationConstraint: { distance: 8 },
    }),
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    if (!over) return
    const cardId = String(active.id)
    const newColumnId = String(over.id)
    // Only call if the card moved to a different column
    if (active.data.current?.status !== newColumnId) {
      onCardDrop(cardId, newColumnId)
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {children}
      <DragOverlay>
        {activeId && renderOverlay ? (
          <div className="rotate-1 opacity-95">{renderOverlay(activeId)}</div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
