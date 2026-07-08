"use client"

import * as React from "react"
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet"
import { EmptyState } from "@/components/shared"
import { formatCents } from "@/lib/format"
import type { useCart } from "../use-cart"

export function CartSheet({
  open,
  onOpenChange,
  cart,
  accentColor,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  cart: ReturnType<typeof useCart>
  accentColor?: string
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col">
        <SheetHeader>
          <SheetTitle>Seu pedido</SheetTitle>
        </SheetHeader>

        <div className="flex-1 space-y-3 overflow-y-auto px-4">
          {cart.lines.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title="Carrinho vazio"
              description="Adicione itens do cardápio para vê-los aqui."
            />
          ) : (
            cart.lines.map((line) => (
              <div key={line.lineId} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {line.productName}
                    </p>
                    {line.selections.length > 0 ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {line.selections.map((s) => s.name).join(", ")}
                      </p>
                    ) : null}
                    {line.notes ? (
                      <p className="truncate text-xs text-muted-foreground italic">
                        &ldquo;{line.notes}&rdquo;
                      </p>
                    ) : null}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => cart.removeLine(line.lineId)}
                    aria-label="Remover item"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon-xs"
                      onClick={() =>
                        cart.setQuantity(line.lineId, line.quantity - 1)
                      }
                      aria-label="Diminuir"
                    >
                      <Minus className="size-3" />
                    </Button>
                    <span className="w-4 text-center text-sm tabular-nums">
                      {line.quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="icon-xs"
                      onClick={() =>
                        cart.setQuantity(line.lineId, line.quantity + 1)
                      }
                      aria-label="Aumentar"
                    >
                      <Plus className="size-3" />
                    </Button>
                  </div>
                  <span className="text-sm font-medium tabular-nums">
                    {formatCents(cart.lineTotal(line))}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.lines.length > 0 ? (
          <SheetFooter className="border-t pt-4">
            <div className="mb-3 flex items-center justify-between text-base font-semibold">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatCents(cart.subtotal)}</span>
            </div>
            <Button
              className="w-full"
              disabled
              style={accentColor ? { backgroundColor: accentColor } : undefined}
            >
              Em breve
            </Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Pedidos online chegam em breve — por enquanto, finalize por
              telefone ou WhatsApp.
            </p>
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
