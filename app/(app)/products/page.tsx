"use client"

import * as React from "react"
import { Plus, Package, MoreHorizontal, Pencil, Trash2, Layers, FolderPen } from "lucide-react"

import { useCan } from "@/features/auth"
import {
  useCategories,
  useProducts,
  useDeleteProduct,
  useDeleteCategory,
  CategoryFormDialog,
  ProductFormDialog,
  ModifierGroupsSheet,
  PRODUCT_STATUS_CONFIG,
} from "@/features/products"
import type { Category, ProductListItem } from "@/features/products/types"
import { PageHeader } from "@/components/app-shell/page-container"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { EmptyState, ErrorState, StatusBadge, PaginationBar, SearchBar, ConfirmDialog } from "@/components/shared"
import { formatCents } from "@/lib/format"
import { useDebouncedValue } from "@/hooks"
import { cn } from "@/lib/utils"

export default function ProductsPage() {
  const canCreate = useCan("products:create")
  const canEdit = useCan("products:edit")
  const canDelete = useCan("products:delete")

  const [selectedCategoryId, setSelectedCategoryId] = React.useState<string | undefined>(undefined)
  const [searchInput, setSearchInput] = React.useState("")
  const search = useDebouncedValue(searchInput)
  const [page, setPage] = React.useState(1)

  const categories = useCategories()
  const products = useProducts({ page, categoryId: selectedCategoryId, search: search || undefined })
  const deleteProduct = useDeleteProduct()
  const deleteCategory = useDeleteCategory()

  const [categoryDialog, setCategoryDialog] = React.useState<{ open: boolean; category: Category | null }>({ open: false, category: null })
  const [productDialog, setProductDialog] = React.useState<{ open: boolean; product: ProductListItem | null }>({ open: false, product: null })
  const [modifiersFor, setModifiersFor] = React.useState<ProductListItem | null>(null)
  const [deleteProductTarget, setDeleteProductTarget] = React.useState<ProductListItem | null>(null)
  const [deleteCategoryTarget, setDeleteCategoryTarget] = React.useState<Category | null>(null)

  const selectCategory = (categoryId: string | undefined) => {
    setSelectedCategoryId(categoryId)
    setPage(1)
  }
  const handleSearchChange = (value: string) => {
    setSearchInput(value)
    setPage(1)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Produtos"
        description="Gerencie categorias, produtos e modificadores do cardápio."
        actions={
          canCreate ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setCategoryDialog({ open: true, category: null })}>
                <FolderPen data-icon="inline-start" />
                Nova categoria
              </Button>
              <Button size="sm" onClick={() => setProductDialog({ open: true, product: null })}>
                <Plus data-icon="inline-start" />
                Novo produto
              </Button>
            </>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
        {/* Categories rail */}
        <div className="space-y-1">
          <button
            onClick={() => selectCategory(undefined)}
            className={cn(
              "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
              selectedCategoryId === undefined && "bg-muted font-medium",
            )}
          >
            Todas
          </button>
          {categories.isLoading ? (
            <div className="space-y-1.5 px-1">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : (
            categories.data?.map((category) => (
              <div
                key={category.id}
                className={cn(
                  "group flex items-center justify-between rounded-lg px-1 text-sm hover:bg-muted",
                  selectedCategoryId === category.id && "bg-muted font-medium",
                )}
              >
                <button onClick={() => selectCategory(category.id)} className="flex-1 truncate px-2 py-2 text-left">
                  {category.name}
                </button>
                <span className="pr-1 text-xs text-muted-foreground">{category.productCount}</span>
                {canEdit ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button variant="ghost" size="icon-xs" className="mr-1 opacity-0 group-hover:opacity-100" aria-label="Ações da categoria" />
                      }
                    >
                      <MoreHorizontal />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setCategoryDialog({ open: true, category })}>
                        <Pencil data-icon="inline-start" />
                        Editar
                      </DropdownMenuItem>
                      {canDelete ? (
                        <DropdownMenuItem variant="destructive" onClick={() => setDeleteCategoryTarget(category)}>
                          <Trash2 data-icon="inline-start" />
                          Excluir
                        </DropdownMenuItem>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </div>
            ))
          )}
          {!categories.isLoading && categories.data?.length === 0 ? (
            <p className="px-2 py-2 text-xs text-muted-foreground">Nenhuma categoria ainda.</p>
          ) : null}
        </div>

        {/* Products table */}
        <div className="space-y-4">
          <SearchBar value={searchInput} onChange={handleSearchChange} placeholder="Buscar produto por nome ou SKU..." />

          {products.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : products.isError ? (
            <ErrorState error={products.error} onRetry={() => products.refetch()} />
          ) : products.data && products.data.items.length > 0 ? (
            <>
              <div className="rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Preço</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Modificadores</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.data.items.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell className="text-muted-foreground">{product.categoryName}</TableCell>
                        <TableCell className="tabular-nums">{formatCents(product.price)}</TableCell>
                        <TableCell>
                          <StatusBadge status={product.status} config={PRODUCT_STATUS_CONFIG} />
                        </TableCell>
                        <TableCell>
                          {product.modifierGroupCount > 0 ? (
                            <Badge variant="secondary">{product.modifierGroupCount} grupo(s)</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Ações do produto" />}>
                              <MoreHorizontal />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => setModifiersFor(product)}>
                                <Layers data-icon="inline-start" />
                                Modificadores
                              </DropdownMenuItem>
                              {canEdit ? (
                                <DropdownMenuItem onClick={() => setProductDialog({ open: true, product })}>
                                  <Pencil data-icon="inline-start" />
                                  Editar
                                </DropdownMenuItem>
                              ) : null}
                              {canDelete ? (
                                <DropdownMenuItem variant="destructive" onClick={() => setDeleteProductTarget(product)}>
                                  <Trash2 data-icon="inline-start" />
                                  Excluir
                                </DropdownMenuItem>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <PaginationBar pagination={products.data.pagination} onPageChange={setPage} />
            </>
          ) : (
            <EmptyState
              icon={Package}
              title="Nenhum produto encontrado"
              description={search || selectedCategoryId ? "Ajuste os filtros ou a busca." : "Comece criando o primeiro produto do cardápio."}
              action={
                canCreate && !search && !selectedCategoryId ? (
                  <Button size="sm" onClick={() => setProductDialog({ open: true, product: null })}>
                    <Plus data-icon="inline-start" />
                    Novo produto
                  </Button>
                ) : undefined
              }
            />
          )}
        </div>
      </div>

      <CategoryFormDialog
        open={categoryDialog.open}
        onOpenChange={(open) => setCategoryDialog((s) => ({ ...s, open }))}
        category={categoryDialog.category}
      />
      <ProductFormDialog
        open={productDialog.open}
        onOpenChange={(open) => setProductDialog((s) => ({ ...s, open }))}
        product={productDialog.product}
        categories={categories.data ?? []}
        defaultCategoryId={selectedCategoryId}
      />
      {modifiersFor ? (
        <ModifierGroupsSheet
          open={!!modifiersFor}
          onOpenChange={(open) => !open && setModifiersFor(null)}
          productId={modifiersFor.id}
          productName={modifiersFor.name}
        />
      ) : null}

      <ConfirmDialog
        open={!!deleteProductTarget}
        onOpenChange={(o) => !o && setDeleteProductTarget(null)}
        title="Excluir produto"
        description={`Tem certeza que deseja excluir "${deleteProductTarget?.name}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        variant="destructive"
        isLoading={deleteProduct.isPending}
        onConfirm={() => {
          if (!deleteProductTarget) return
          deleteProduct.mutate(deleteProductTarget.id, { onSuccess: () => setDeleteProductTarget(null) })
        }}
      />
      <ConfirmDialog
        open={!!deleteCategoryTarget}
        onOpenChange={(o) => !o && setDeleteCategoryTarget(null)}
        title="Excluir categoria"
        description={`Tem certeza que deseja excluir "${deleteCategoryTarget?.name}"?`}
        confirmLabel="Excluir"
        variant="destructive"
        isLoading={deleteCategory.isPending}
        onConfirm={() => {
          if (!deleteCategoryTarget) return
          deleteCategory.mutate(deleteCategoryTarget.id, {
            onSuccess: () => {
              if (selectedCategoryId === deleteCategoryTarget.id) setSelectedCategoryId(undefined)
              setDeleteCategoryTarget(null)
            },
          })
        }}
      />
    </div>
  )
}
