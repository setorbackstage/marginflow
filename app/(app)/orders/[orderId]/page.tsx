"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Plus, Trash2, MapPin, Loader2 } from "lucide-react"

import { useCan } from "@/features/auth"
import {
  useOrder,
  OrderStatusActions,
  OrderTimeline,
  OrderPaymentCard,
  ORDER_STATUS_CONFIG,
  ORDER_TYPE_LABEL,
  ORDER_CHANNEL_LABEL,
} from "@/features/orders"
import { useRemoveOrderItem } from "@/features/orders/hooks"
import { useProducts } from "@/features/products/hooks"
import { AddItemDialog } from "@/features/orders/components/add-item-dialog"
import type { CartItem } from "@/features/orders/components/create-order-dialog"
import { useAddOrderItem } from "@/features/orders/hooks"
import type { ProductListItem } from "@/features/products/types"
import { PageHeader } from "@/components/app-shell/page-container"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { ConfirmDialog, ErrorState, StatusBadge, SearchBar } from "@/components/shared"
import { formatCents, formatDateTime } from "@/lib/format"
import { useDebouncedValue } from "@/hooks"

const EDITABLE_STATUSES = ["DRAFT", "PENDING"]

export default function OrderDetailPage() {
  const params = useParams<{ orderId: string }>()
  const router = useRouter()
  const canEdit = useCan("orders:edit")

  const order = useOrder(params.orderId)
  const removeItem = useRemoveOrderItem(params.orderId)

  const [addProductSearch, setAddProductSearch] = React.useState("")
  const debouncedSearch = useDebouncedValue(addProductSearch)
  const [addPickerOpen, setAddPickerOpen] = React.useState(false)
  const [pickerProduct, setPickerProduct] = React.useState<ProductListItem | null>(null)
  const [removeTarget, setRemoveTarget] = React.useState<string | null>(null)
  const addItem = useAddOrderItem(params.orderId)
  const products = useProducts({ search: debouncedSearch || undefined, status: "ACTIVE" })

  if (order.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }
  if (order.isError || !order.data) {
    return <ErrorState error={order.error} onRetry={() => order.refetch()} />
  }

  const data = order.data
  const isEditable = EDITABLE_STATUSES.includes(data.status)

  const handleAddCartItem = (item: CartItem) => {
    addItem.mutate({
      productId: item.productId,
      quantity: item.quantity,
      selectedModifiers: item.selectedModifiers.map((m) => ({ modifierId: m.modifierId, modifierGroupId: m.modifierGroupId })),
      notes: item.notes,
    })
    setAddPickerOpen(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button variant="ghost" size="sm" onClick={() => router.push("/orders")} className="mb-2">
          <ArrowLeft data-icon="inline-start" />
          Voltar para Pedidos
        </Button>
        <PageHeader
          title={`Pedido #${data.number}`}
          description={`${ORDER_TYPE_LABEL[data.type]} · ${ORDER_CHANNEL_LABEL[data.channel]} · ${formatDateTime(data.createdAt)}`}
          actions={
            <div className="flex items-center gap-2">
              <StatusBadge status={data.status} config={ORDER_STATUS_CONFIG} />
            </div>
          }
        />
      </div>

      <OrderStatusActions order={data} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Itens do pedido</CardTitle>
              {isEditable && canEdit ? (
                <Button size="sm" variant="outline" onClick={() => setAddPickerOpen(true)}>
                  <Plus data-icon="inline-start" />
                  Adicionar item
                </Button>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-3">
              {data.items.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-3 rounded-lg border p-3 text-sm">
                  <div>
                    <p className="font-medium">
                      {item.quantity}× {item.productName}
                    </p>
                    {item.selectedModifiers.length > 0 ? (
                      <p className="text-xs text-muted-foreground">{item.selectedModifiers.map((m) => m.name).join(", ")}</p>
                    ) : null}
                    {item.notes ? <p className="text-xs text-muted-foreground">Obs: {item.notes}</p> : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums">{formatCents(item.subtotal)}</span>
                    {isEditable && canEdit ? (
                      <Button variant="ghost" size="icon-sm" aria-label="Remover item" onClick={() => setRemoveTarget(item.id)}>
                        <Trash2 />
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}

              <div className="space-y-1 border-t pt-3 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{formatCents(data.itemsTotal)}</span>
                </div>
                {data.discountTotal > 0 ? (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Desconto</span>
                    <span className="tabular-nums">−{formatCents(data.discountTotal)}</span>
                  </div>
                ) : null}
                {data.deliveryFee > 0 ? (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Taxa de entrega</span>
                    <span className="tabular-nums">{formatCents(data.deliveryFee)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between text-base font-semibold">
                  <span>Total</span>
                  <span className="tabular-nums">{formatCents(data.grandTotal)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {data.type === "DELIVERY" && data.deliveryAddress ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <MapPin className="size-4" />
                  Endereço de entrega
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {data.deliveryAddress.street}, {data.deliveryAddress.number}
                {data.deliveryAddress.complement ? ` — ${data.deliveryAddress.complement}` : ""}
                <br />
                {data.deliveryAddress.neighborhood}, {data.deliveryAddress.city}/{data.deliveryAddress.state} · {data.deliveryAddress.postalCode}
              </CardContent>
            </Card>
          ) : null}

          {data.notes ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Observações</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{data.notes}</CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          {data.customer ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Cliente</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <p className="font-medium">{data.customer.name}</p>
                <p className="text-muted-foreground">{data.customer.phone}</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Cliente</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="secondary">Cliente avulso</Badge>
              </CardContent>
            </Card>
          )}

          <OrderPaymentCard order={data} />

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Histórico</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderTimeline orderId={data.id} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add item picker: reuses the search list from create-order-dialog, standalone here */}
      {addPickerOpen ? (
        <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/10 p-4 pt-24" onClick={() => setAddPickerOpen(false)}>
          <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle className="text-sm">Adicionar item</CardTitle>
            </CardHeader>
            <CardContent>
              <SearchBar value={addProductSearch} onChange={setAddProductSearch} placeholder="Buscar produto..." />
              <div className="mt-2 max-h-64 space-y-1 overflow-y-auto">
                {products.isLoading ? (
                  <Skeleton className="h-8 w-full" />
                ) : (
                  products.data?.items.map((product) => (
                    <button
                      key={product.id}
                      className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                      onClick={() => {
                        if (product.modifierGroupCount > 0) {
                          setPickerProduct(product)
                        } else {
                          handleAddCartItem({
                            productId: product.id,
                            productName: product.name,
                            unitPrice: product.price,
                            quantity: 1,
                            selectedModifiers: [],
                            notes: null,
                          })
                        }
                      }}
                    >
                      <span>{product.name}</span>
                      <span className="text-muted-foreground">{formatCents(product.price)}</span>
                    </button>
                  ))
                )}
              </div>
              {addItem.isPending ? (
                <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" /> Adicionando...
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <AddItemDialog
        key={pickerProduct?.id}
        open={!!pickerProduct}
        onOpenChange={(o) => !o && setPickerProduct(null)}
        product={pickerProduct}
        onAdd={handleAddCartItem}
      />

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(o) => !o && setRemoveTarget(null)}
        title="Remover item"
        description="Tem certeza que deseja remover este item do pedido?"
        confirmLabel="Remover"
        variant="destructive"
        isLoading={removeItem.isPending}
        onConfirm={() => {
          if (!removeTarget) return
          removeItem.mutate(removeTarget, { onSuccess: () => setRemoveTarget(null) })
        }}
      />
    </div>
  )
}
