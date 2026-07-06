"use client"

import * as React from "react"
import { Plus, BookOpenText, Layers, Eye, Loader2 } from "lucide-react"

import { useCan } from "@/features/auth"
import {
  useMenus,
  usePublishMenu,
  useUnpublishMenu,
  useDeleteMenu,
  MenuFormDialog,
  MenuSectionsSheet,
  MenuPreviewSheet,
  MENU_STATUS_CONFIG,
  MENU_CHANNEL_LABEL,
} from "@/features/menus"
import { PageHeader } from "@/components/app-shell/page-container"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState, ErrorState, StatusBadge, ConfirmDialog } from "@/components/shared"

export default function MenuPage() {
  const canCreate = useCan("menu:create")
  const canEdit = useCan("menu:edit")
  const canPublish = useCan("menu:publish")

  const menus = useMenus()
  const publish = usePublishMenu()
  const unpublish = useUnpublishMenu()
  const deleteMenu = useDeleteMenu()

  const [formOpen, setFormOpen] = React.useState(false)
  const [sectionsMenuId, setSectionsMenuId] = React.useState<string | null>(null)
  const [previewMenuId, setPreviewMenuId] = React.useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<{ id: string; name: string } | null>(null)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Cardápio"
        description="Gerencie os cardápios e suas seções por canal de venda."
        actions={
          canCreate ? (
            <Button size="sm" onClick={() => setFormOpen(true)}>
              <Plus data-icon="inline-start" />
              Novo cardápio
            </Button>
          ) : undefined
        }
      />

      {menus.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : menus.isError ? (
        <ErrorState error={menus.error} onRetry={() => menus.refetch()} />
      ) : menus.data && menus.data.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {menus.data.map((menu) => (
            <Card key={menu.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">{menu.name}</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">{MENU_CHANNEL_LABEL[menu.channel]}</p>
                </div>
                <StatusBadge status={menu.status} config={MENU_STATUS_CONFIG} />
              </CardHeader>
              <CardContent className="space-y-3">
                <Badge variant="secondary">{menu.sectionCount} seção(ões)</Badge>
                <div className="flex flex-wrap gap-2">
                  {canEdit ? (
                    <Button variant="outline" size="sm" onClick={() => setSectionsMenuId(menu.id)}>
                      <Layers data-icon="inline-start" />
                      Seções
                    </Button>
                  ) : null}
                  <Button variant="outline" size="sm" onClick={() => setPreviewMenuId(menu.id)}>
                    <Eye data-icon="inline-start" />
                    Preview
                  </Button>
                  {canPublish ? (
                    menu.status === "ACTIVE" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={unpublish.isPending}
                        onClick={() => unpublish.mutate(menu.id)}
                      >
                        {unpublish.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                        Despublicar
                      </Button>
                    ) : (
                      <Button size="sm" disabled={publish.isPending} onClick={() => publish.mutate(menu.id)}>
                        {publish.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                        Publicar
                      </Button>
                    )
                  ) : null}
                  {canEdit ? (
                    <Button variant="ghost" size="sm" onClick={() => setDeleteTarget({ id: menu.id, name: menu.name })}>
                      Excluir
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={BookOpenText}
          title="Nenhum cardápio criado"
          description="Crie um cardápio para organizar as categorias por canal de venda."
          action={
            canCreate ? (
              <Button size="sm" onClick={() => setFormOpen(true)}>
                <Plus data-icon="inline-start" />
                Novo cardápio
              </Button>
            ) : undefined
          }
        />
      )}

      <MenuFormDialog open={formOpen} onOpenChange={setFormOpen} />

      {sectionsMenuId ? (
        <MenuSectionsSheet open={!!sectionsMenuId} onOpenChange={(o) => !o && setSectionsMenuId(null)} menuId={sectionsMenuId} />
      ) : null}

      {previewMenuId ? (
        <MenuPreviewSheet open={!!previewMenuId} onOpenChange={(o) => !o && setPreviewMenuId(null)} menuId={previewMenuId} />
      ) : null}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Excluir cardápio"
        description={`Tem certeza que deseja excluir "${deleteTarget?.name}"?`}
        confirmLabel="Excluir"
        variant="destructive"
        isLoading={deleteMenu.isPending}
        onConfirm={() => {
          if (!deleteTarget) return
          deleteMenu.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
        }}
      />
    </div>
  )
}
