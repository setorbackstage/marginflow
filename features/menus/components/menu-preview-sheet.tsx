"use client"

import * as React from "react"
import { UtensilsCrossed } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { EmptyState, ErrorState, StatusBadge } from "@/components/shared"
import { useMenu, MENU_STATUS_CONFIG, MENU_CHANNEL_LABEL } from "@/features/menus"
import { useProductsByCategoryIds } from "@/features/products/hooks"
import { formatCents } from "@/lib/format"

/**
 * Read-only "how the customer sees it" preview — visible sections in order,
 * each with its active products. Assembled entirely from GET /menus/:id
 * (sections) plus GET /products?categoryId=... per visible category; there
 * is no dedicated preview/rendering endpoint to consume.
 */
export function MenuPreviewSheet({
  open,
  onOpenChange,
  menuId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  menuId: string
}) {
  const menu = useMenu(open ? menuId : undefined)

  const visibleSections = React.useMemo(
    () => (menu.data?.sections ?? []).filter((s) => s.isVisible).sort((a, b) => a.sortOrder - b.sortOrder),
    [menu.data],
  )
  const { byCategory, isLoading: productsLoading } = useProductsByCategoryIds(visibleSections.map((s) => s.category.id))

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <div className="flex items-center justify-between gap-2">
            <SheetTitle>{menu.data?.name ?? "Preview do cardápio"}</SheetTitle>
            {menu.data ? <StatusBadge status={menu.data.status} config={MENU_STATUS_CONFIG} /> : null}
          </div>
          <SheetDescription>
            {menu.data ? `Como aparece para o cliente — canal ${MENU_CHANNEL_LABEL[menu.data.channel]}.` : "Carregando…"}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto p-4">
          {menu.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : menu.isError ? (
            <ErrorState error={menu.error} onRetry={() => menu.refetch()} />
          ) : visibleSections.length === 0 ? (
            <EmptyState
              icon={UtensilsCrossed}
              title="Nenhuma seção visível"
              description="Marque categorias como visíveis em “Seções” para que apareçam neste preview."
            />
          ) : (
            visibleSections.map((section) => {
              const products = byCategory.get(section.category.id)
              return (
                <div key={section.category.id}>
                  <h3 className="text-sm font-semibold">{section.category.name}</h3>
                  <div className="mt-2 space-y-2">
                    {!products && productsLoading ? (
                      <Skeleton className="h-12 w-full" />
                    ) : products && products.length > 0 ? (
                      products.map((product) => (
                        <div key={product.id} className="flex items-start justify-between gap-3 rounded-lg border p-2.5">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{product.name}</p>
                            {product.description ? (
                              <p className="line-clamp-1 text-xs text-muted-foreground">{product.description}</p>
                            ) : null}
                          </div>
                          <span className="shrink-0 text-sm tabular-nums">{formatCents(product.price)}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">Nenhum produto ativo nesta categoria.</p>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
