"use client"

import * as React from "react"
import { ArrowUp, ArrowDown, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet"
import { useCategories } from "@/features/products/hooks"
import { useMenu, useReplaceSections } from "@/features/menus/hooks"
import type { MenuSectionInput } from "@/features/menus/types"
import { useSyncedState } from "@/hooks"

interface Row {
  categoryId: string
  categoryName: string
  isVisible: boolean
}

export function MenuSectionsSheet({ open, onOpenChange, menuId }: { open: boolean; onOpenChange: (open: boolean) => void; menuId: string }) {
  const menu = useMenu(menuId)
  const categories = useCategories()
  const replaceSections = useReplaceSections(menuId)

  const initialRows = React.useMemo<Row[]>(() => {
    if (!menu.data || !categories.data) return []
    const included = menu.data.sections
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((s) => ({ categoryId: s.category.id, categoryName: s.category.name, isVisible: s.isVisible }))
    const includedIds = new Set(included.map((r) => r.categoryId))
    const notIncluded = categories.data.filter((c) => !includedIds.has(c.id)).map((c) => ({ categoryId: c.id, categoryName: c.name, isVisible: false }))
    return [...included, ...notIncluded]
  }, [menu.data, categories.data])
  const [rows, setRows] = useSyncedState(initialRows)

  const move = (index: number, delta: number) => {
    setRows((prev) => {
      const next = [...prev]
      const target = index + delta
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  const toggleVisible = (index: number) => setRows((prev) => prev.map((r, i) => (i === index ? { ...r, isVisible: !r.isVisible } : r)))

  const handleSave = () => {
    const sections: MenuSectionInput[] = rows
      .filter((r) => r.isVisible)
      .map((r, index) => ({ categoryId: r.categoryId, sortOrder: index, isVisible: true }))
    replaceSections.mutate(sections, { onSuccess: () => onOpenChange(false) })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>Seções do cardápio</SheetTitle>
          <SheetDescription>Marque as categorias visíveis neste cardápio e defina a ordem.</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-1.5 overflow-y-auto p-4">
          {menu.isLoading || categories.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            rows.map((row, index) => (
              <div key={row.categoryId} className="flex items-center justify-between gap-2 rounded-lg border p-2.5">
                <Label className="flex flex-1 items-center gap-2 text-sm font-normal">
                  <Checkbox checked={row.isVisible} onCheckedChange={() => toggleVisible(index)} />
                  {row.categoryName}
                </Label>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon-xs" onClick={() => move(index, -1)} aria-label="Mover para cima" disabled={index === 0}>
                    <ArrowUp />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => move(index, 1)}
                    aria-label="Mover para baixo"
                    disabled={index === rows.length - 1}
                  >
                    <ArrowDown />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <SheetFooter className="border-t">
          <Button onClick={handleSave} disabled={replaceSections.isPending}>
            {replaceSections.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Salvar seções
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
