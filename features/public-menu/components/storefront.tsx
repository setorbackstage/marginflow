"use client"

import * as React from "react"
import Image from "next/image"
import {
  Search,
  ShoppingBag,
  Phone,
  AtSign,
  MapPin,
  Clock,
  ImageOff,
} from "lucide-react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatCents } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useCart } from "../use-cart"
import { isStoreOpenNow } from "../open-status"
import { ProductDialog } from "./product-dialog"
import { CartSheet } from "./cart-sheet"
import type { PublicStorefront, PublicProduct } from "../types"

export function Storefront({ storefront }: { storefront: PublicStorefront }) {
  const { store, sections } = storefront
  const cart = useCart(store.slug)
  const [query, setQuery] = React.useState("")
  const [activeProduct, setActiveProduct] =
    React.useState<PublicProduct | null>(null)
  const [cartOpen, setCartOpen] = React.useState(false)
  // Re-derived every 60s via a ticking external store rather than
  // setState-in-effect — the server snapshot (`null`) hides the Aberto/
  // Fechado badge until the client can evaluate the store's own timezone.
  const isOpen = React.useSyncExternalStore(
    React.useCallback((onStoreChange) => {
      const interval = setInterval(onStoreChange, 60_000)
      return () => clearInterval(interval)
    }, []),
    () => isStoreOpenNow(store.operatingHours, store.timezone),
    () => null,
  )

  const filteredSections = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sections
    return sections
      .map((section) => ({
        ...section,
        products: section.products.filter((p) =>
          p.name.toLowerCase().includes(q),
        ),
      }))
      .filter((section) => section.products.length > 0)
  }, [sections, query])

  const themeStyle = {
    "--public-primary": store.primaryColor ?? "var(--primary)",
    "--public-secondary": store.secondaryColor ?? "var(--secondary)",
  } as React.CSSProperties

  const address = [
    store.address.street,
    store.address.number,
    store.address.neighborhood,
    store.address.city,
  ]
    .filter(Boolean)
    .join(", ")

  return (
    <div
      style={themeStyle}
      className="mx-auto min-h-svh max-w-2xl bg-background pb-24"
    >
      {/* Banner */}
      <div className="relative aspect-[3/1] w-full bg-muted">
        {store.menuBannerUrl ? (
          <Image
            src={store.menuBannerUrl}
            alt=""
            fill
            priority
            className="object-cover"
            unoptimized
          />
        ) : (
          <div
            className="flex size-full items-center justify-center"
            style={{ backgroundColor: "var(--public-primary)" }}
          />
        )}
      </div>

      {/* Header */}
      <div className="relative px-4">
        <div className="relative -mt-8 flex size-16 items-center justify-center overflow-hidden rounded-2xl border-4 border-background bg-card shadow-sm">
          {store.logoUrl ? (
            <Image
              src={store.logoUrl}
              alt={store.name}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <span
              className="text-xl font-semibold"
              style={{ color: "var(--public-primary)" }}
            >
              {store.name.slice(0, 1)}
            </span>
          )}
        </div>

        <div className="mt-2 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold">{store.name}</h1>
            {store.description ? (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {store.description}
              </p>
            ) : null}
          </div>
          {isOpen !== null ? (
            <Badge
              variant={isOpen ? "default" : "secondary"}
              className="shrink-0 gap-1"
            >
              <Clock className="size-3" />
              {isOpen ? "Aberto" : "Fechado"}
            </Badge>
          ) : null}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {address ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" />
              {address}
            </span>
          ) : null}
          {store.phone ? (
            <span className="inline-flex items-center gap-1">
              <Phone className="size-3.5" />
              {store.phone}
            </span>
          ) : null}
          {store.instagramHandle ? (
            <a
              href={`https://instagram.com/${store.instagramHandle.replace(/^@/, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              <AtSign className="size-3.5" />
              {store.instagramHandle.replace(/^@/, "")}
            </a>
          ) : null}
        </div>

        {/* Search */}
        <div className="relative mt-4">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar no cardápio…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-10 pl-8"
          />
        </div>
      </div>

      {/* Category quick-nav */}
      {sections.length > 1 ? (
        <div className="mt-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {sections.map((section) => (
            <a
              key={section.categoryId}
              href={`#cat-${section.categoryId}`}
              className="shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap hover:bg-muted"
            >
              {section.categoryName}
            </a>
          ))}
        </div>
      ) : null}

      {/* Sections */}
      <div className="mt-2 space-y-6 px-4">
        {filteredSections.map((section) => (
          <div
            key={section.categoryId}
            id={`cat-${section.categoryId}`}
            className="scroll-mt-4"
          >
            <h2 className="mb-2 text-base font-semibold">
              {section.categoryName}
            </h2>
            <div className="divide-y rounded-lg border">
              {section.products.map((product) => (
                <button
                  key={product.id}
                  onClick={() => setActiveProduct(product)}
                  className="flex w-full items-center gap-3 p-3 text-left hover:bg-muted"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {product.name}
                    </p>
                    {product.description ? (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {product.description}
                      </p>
                    ) : null}
                    <p
                      className="mt-1 text-sm font-semibold tabular-nums"
                      style={{ color: "var(--public-primary)" }}
                    >
                      {formatCents(product.price)}
                    </p>
                  </div>
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {product.imageUrl ? (
                      <Image
                        src={product.imageUrl}
                        alt=""
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-muted-foreground">
                        <ImageOff className="size-5" />
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
        {filteredSections.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Nenhum item encontrado.
          </p>
        ) : null}
      </div>

      {/* Floating cart button */}
      {cart.itemCount > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-2xl p-3">
          <Button
            className={cn("w-full justify-between shadow-lg")}
            style={{ backgroundColor: "var(--public-primary)" }}
            onClick={() => setCartOpen(true)}
          >
            <span className="flex items-center gap-2">
              <ShoppingBag className="size-4" />
              {cart.itemCount} {cart.itemCount === 1 ? "item" : "itens"}
            </span>
            <span className="tabular-nums">{formatCents(cart.subtotal)}</span>
          </Button>
        </div>
      ) : null}

      <ProductDialog
        key={activeProduct?.id}
        product={activeProduct}
        open={!!activeProduct}
        onOpenChange={(open) => !open && setActiveProduct(null)}
        onAdd={({ quantity, selections, notes }) => {
          if (!activeProduct) return
          cart.addLine({
            productId: activeProduct.id,
            productName: activeProduct.name,
            unitPrice: activeProduct.price,
            quantity,
            selections,
            notes,
          })
        }}
      />

      <CartSheet
        open={cartOpen}
        onOpenChange={setCartOpen}
        cart={cart}
        accentColor={store.primaryColor ?? undefined}
      />
    </div>
  )
}
