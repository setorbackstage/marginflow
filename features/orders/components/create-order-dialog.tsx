"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2, Plus, Trash2, Search, ChevronDown, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { SearchBar } from "@/components/shared"
import { formatCents } from "@/lib/format"
import { useDebouncedValue } from "@/hooks"
import { useCustomers } from "@/features/customers/hooks"
import type { CustomerListItem } from "@/features/customers/types"
import { useAddresses } from "@/features/customers/hooks"
import { useProducts } from "@/features/products/hooks"
import type { ProductListItem } from "@/features/products/types"
import { ORDER_TYPE_LABEL, ORDER_CHANNEL_LABEL } from "@/features/orders/status"
import { useCreateOrder } from "@/features/orders/hooks"
import type { OrderType, OrderChannel } from "@/features/orders/types"
import { AddItemDialog } from "./add-item-dialog"

export interface CartItem {
  productId: string
  productName: string
  unitPrice: number
  quantity: number
  selectedModifiers: { modifierId: string; modifierGroupId: string; name: string; priceAdjustment: number }[]
  notes: string | null
}

function CustomerPicker({ value, onChange }: { value: CustomerListItem | null; onChange: (customer: CustomerListItem | null) => void }) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const debounced = useDebouncedValue(search)
  const customers = useCustomers({ search: debounced || undefined, status: "ACTIVE" })

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button variant="outline" className="w-full justify-between font-normal">
            <span className="truncate">{value ? value.name : "Cliente avulso (opcional)"}</span>
            <ChevronDown className="size-4 text-muted-foreground" />
          </Button>
        }
      />
      <PopoverContent className="w-80 p-2">
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar cliente..." />
        <div className="mt-2 max-h-56 space-y-0.5 overflow-y-auto">
          {value ? (
            <button
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-muted"
              onClick={() => {
                onChange(null)
                setOpen(false)
              }}
            >
              <X className="size-3.5" /> Remover cliente
            </button>
          ) : null}
          {customers.isLoading ? (
            <Skeleton className="h-8 w-full" />
          ) : (
            customers.data?.items.map((customer) => (
              <button
                key={customer.id}
                className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                onClick={() => {
                  onChange(customer)
                  setOpen(false)
                }}
              >
                <p className="font-medium">{customer.name}</p>
                <p className="text-xs text-muted-foreground">{customer.phone}</p>
              </button>
            ))
          )}
          {!customers.isLoading && customers.data?.items.length === 0 ? (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">Nenhum cliente encontrado.</p>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  )
}

/**
 * Callers must render this with a `key` that changes each time it should
 * open with a clean slate (e.g. a counter bumped right before `onOpenChange
 * (true)`), since form state resets by remounting rather than via an effect.
 */
export function CreateOrderDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter()
  const createOrder = useCreateOrder()

  const [type, setTypeState] = React.useState<OrderType>("TAKEAWAY")
  const [channel, setChannel] = React.useState<OrderChannel>("IN_STORE")
  const [customer, setCustomerState] = React.useState<CustomerListItem | null>(null)
  const [addressId, setAddressId] = React.useState<string | undefined>(undefined)
  const [tableNumber, setTableNumber] = React.useState("")
  const [notes, setNotes] = React.useState("")
  const [cart, setCart] = React.useState<CartItem[]>([])
  const [productSearch, setProductSearch] = React.useState("")
  const debouncedProductSearch = useDebouncedValue(productSearch)
  const [pickerProduct, setPickerProduct] = React.useState<ProductListItem | null>(null)

  const addresses = useAddresses(type === "DELIVERY" ? customer?.id : undefined)
  const products = useProducts({ search: debouncedProductSearch || undefined, status: "ACTIVE" })

  // The delivery address only makes sense for the customer/type it was picked
  // under, so both setters clear it inline instead of via a reactive effect.
  const setType = (next: OrderType) => {
    setTypeState(next)
    setAddressId(undefined)
  }
  const setCustomer = (next: CustomerListItem | null) => {
    setCustomerState(next)
    setAddressId(undefined)
  }

  const handleProductClick = (product: ProductListItem) => {
    if (product.modifierGroupCount > 0) {
      setPickerProduct(product)
    } else {
      setCart((prev) => [...prev, { productId: product.id, productName: product.name, unitPrice: product.price, quantity: 1, selectedModifiers: [], notes: null }])
    }
  }

  const removeCartItem = (index: number) => setCart((prev) => prev.filter((_, i) => i !== index))
  const updateQuantity = (index: number, delta: number) =>
    setCart((prev) => prev.map((item, i) => (i === index ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item)))

  const itemTotal = (item: CartItem) => (item.unitPrice + item.selectedModifiers.reduce((s, m) => s + m.priceAdjustment, 0)) * item.quantity
  const grandTotal = cart.reduce((sum, item) => sum + itemTotal(item), 0)

  const canSubmit = cart.length > 0 && (type !== "DELIVERY" || (customer && addressId)) && (type !== "DINE_IN" || tableNumber.trim().length > 0)

  const handleSubmit = () => {
    createOrder.mutate(
      {
        type,
        channel,
        customerId: customer?.id ?? null,
        deliveryAddressId: type === "DELIVERY" ? addressId : null,
        tableNumber: type === "DINE_IN" ? tableNumber : null,
        notes: notes || null,
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          selectedModifiers: item.selectedModifiers.map((m) => ({ modifierId: m.modifierId, modifierGroupId: m.modifierGroupId })),
          notes: item.notes,
        })),
      },
      {
        onSuccess: async (order) => {
          // Advance DRAFT → PENDING immediately so the order appears in the
          // Kanban and the kitchen is notified without the user having to
          // manually click "Enviar pedido" on the detail screen.
          try {
            await import("@/features/orders/api").then(({ ordersApi }) =>
              ordersApi.updateStatus(order.storeId, order.id, "PENDING"),
            )
          } catch {
            // If the auto-advance fails (e.g. autoConfirm is off and the
            // transition is rejected), the order still exists in DRAFT and the
            // user can advance it manually from the detail screen.
          }
          onOpenChange(false)
          router.push(`/orders/${order.id}`)
        },
      },
    )
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full gap-0 sm:max-w-xl">
          <SheetHeader className="border-b">
            <SheetTitle>Novo pedido</SheetTitle>
          </SheetHeader>

          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5">Tipo</Label>
                <Select value={type} onValueChange={(v) => v && setType(v as OrderType)} items={ORDER_TYPE_LABEL}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TAKEAWAY">Retirada</SelectItem>
                    <SelectItem value="DELIVERY">Entrega</SelectItem>
                    <SelectItem value="DINE_IN">Salão</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5">Canal</Label>
                <Select value={channel} onValueChange={(v) => v && setChannel(v as OrderChannel)} items={ORDER_CHANNEL_LABEL}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ORDER_CHANNEL_LABEL).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="mb-1.5">Cliente</Label>
              <CustomerPicker value={customer} onChange={setCustomer} />
            </div>

            {type === "DELIVERY" ? (
              <div>
                <Label className="mb-1.5">Endereço de entrega</Label>
                {!customer ? (
                  <p className="text-sm text-muted-foreground">Selecione um cliente para escolher o endereço.</p>
                ) : addresses.isLoading ? (
                  <Skeleton className="h-8 w-full" />
                ) : addresses.data && addresses.data.length > 0 ? (
                  <Select value={addressId} onValueChange={(v) => setAddressId(v ?? undefined)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione um endereço">
                        {(v: string | null) => {
                          const addr = addresses.data?.find((a) => a.id === v)
                          return addr ? `${addr.street}, ${addr.number} — ${addr.neighborhood}` : ""
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {addresses.data.map((addr) => (
                        <SelectItem key={addr.id} value={addr.id}>
                          {addr.street}, {addr.number} — {addr.neighborhood}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-muted-foreground">Este cliente não possui endereços cadastrados.</p>
                )}
              </div>
            ) : null}

            {type === "DINE_IN" ? (
              <div>
                <Label htmlFor="table-number" className="mb-1.5">
                  Número da mesa
                </Label>
                <Input id="table-number" value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} />
              </div>
            ) : null}

            <div>
              <Label className="mb-1.5">Produtos</Label>
              <SearchBar value={productSearch} onChange={setProductSearch} placeholder="Buscar produto..." />
              <div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-lg border p-1">
                {products.isLoading ? (
                  <Skeleton className="h-8 w-full" />
                ) : products.data && products.data.items.length > 0 ? (
                  products.data.items.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => handleProductClick(product)}
                      className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                    >
                      <span>{product.name}</span>
                      <span className="flex items-center gap-2 text-muted-foreground">
                        {formatCents(product.price)}
                        <Plus className="size-3.5" />
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground">
                    <Search className="size-4" /> Nenhum produto encontrado.
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label className="mb-1.5">Itens do pedido</Label>
              {cart.length === 0 ? (
                <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                  Nenhum item adicionado ainda.
                </p>
              ) : (
                <div className="space-y-2">
                  {cart.map((item, index) => (
                    <div key={index} className="rounded-lg border p-2.5 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{item.productName}</p>
                          {item.selectedModifiers.length > 0 ? (
                            <p className="text-xs text-muted-foreground">{item.selectedModifiers.map((m) => m.name).join(", ")}</p>
                          ) : null}
                        </div>
                        <Button variant="ghost" size="icon-sm" onClick={() => removeCartItem(index)} aria-label="Remover item">
                          <Trash2 />
                        </Button>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="icon-xs" onClick={() => updateQuantity(index, -1)} aria-label="Diminuir">
                            <span className="text-xs">−</span>
                          </Button>
                          <span className="w-5 text-center tabular-nums">{item.quantity}</span>
                          <Button variant="outline" size="icon-xs" onClick={() => updateQuantity(index, 1)} aria-label="Aumentar">
                            <Plus className="size-3" />
                          </Button>
                        </div>
                        <span className="tabular-nums">{formatCents(itemTotal(item))}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="order-notes" className="mb-1.5">
                Observações (opcional)
              </Label>
              <Textarea id="order-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>

          <SheetFooter className="flex-row items-center justify-between border-t">
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-lg font-semibold tabular-nums">{formatCents(grandTotal)}</p>
            </div>
            <Button onClick={handleSubmit} disabled={!canSubmit || createOrder.isPending}>
              {createOrder.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Criar pedido
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AddItemDialog
        key={pickerProduct?.id}
        open={!!pickerProduct}
        onOpenChange={(o) => !o && setPickerProduct(null)}
        product={pickerProduct}
        onAdd={(item) => setCart((prev) => [...prev, item])}
      />
    </>
  )
}
