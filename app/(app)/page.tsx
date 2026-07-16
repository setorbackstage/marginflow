"use client"

import Link from "next/link"
import Image from "next/image"
import {
  ReceiptText,
  Users,
  Package,
  Wallet,
  Truck,
  ChefHat,
  CreditCard,
  ArrowRight,
  Store,
  TriangleAlert,
  Clock,
} from "lucide-react"

import { useAuth, useCan } from "@/features/auth"
import { useStore } from "@/features/stores"
import { useOnboardingSettings, useSetTourPending } from "@/features/onboarding"
import { DashboardTour } from "@/components/onboarding/dashboard-tour"
import { useDashboardCounts, useDashboardOrdersToday, useRecentOrders, useRecentStockMovements, useDashboardRecentPayments, useDashboardRecentCustomers } from "@/features/dashboard/hooks"
import { useStockAlerts, useInventoryValue, useInventoryInsights, formatQuantity, MOVEMENT_TYPE_CONFIG } from "@/features/inventory"
import { ORDER_STATUS_CONFIG, ORDER_CHANNEL_LABEL } from "@/features/orders"
import { PageHeader } from "@/components/app-shell/page-container"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { StatusBadge, EmptyState, LastUpdated } from "@/components/shared"
import { formatCents, formatRelative } from "@/lib/format"

interface Kpi {
  label: string
  value: number | undefined
  icon: typeof ReceiptText
  href: string
  isLoading: boolean
  isError: boolean
}

function KpiCard({ kpi }: { kpi: Kpi }) {
  return (
    <Link href={kpi.href} className="group">
      <Card className="transition-colors group-hover:border-primary/40">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.label}</CardTitle>
          <kpi.icon className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {kpi.isLoading ? (
            <Skeleton className="h-8 w-16" />
          ) : kpi.isError ? (
            <span className="text-sm text-destructive">Erro ao carregar</span>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-3xl font-semibold tabular-nums">{kpi.value ?? 0}</span>
              <ArrowRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}

/**
 * Real low-stock data from GET /inventory/alerts — mounted only for users
 * with inventory:view (the endpoint would 403 otherwise). Hidden while the
 * store has no active alerts.
 */
function StockAlertsCard() {
  const alerts = useStockAlerts()
  if (alerts.isLoading || alerts.isError || !alerts.data || alerts.data.length === 0) return null

  return (
    <Link href="/inventory" className="group">
      <Card className="border-amber-500/40 transition-colors group-hover:border-amber-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Estoque baixo</CardTitle>
          <TriangleAlert className="size-4 text-amber-600 dark:text-amber-500" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-3xl font-semibold tabular-nums">{alerts.data.length}</span>
            <ArrowRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {alerts.data
              .slice(0, 2)
              .map((alert) => `${alert.ingredientName} (${formatQuantity(alert.currentStock, alert.unit)})`)
              .join(", ")}
            {alerts.data.length > 2 ? ` e mais ${alerts.data.length - 2}` : ""}
          </p>
        </CardContent>
      </Card>
    </Link>
  )
}

/** Sprint 3 Dashboard: total stock value, mirroring the Estoque page's own card. */
function InventoryValueCard() {
  const inventoryValue = useInventoryValue()
  if (inventoryValue.isLoading || inventoryValue.isError) return null

  return (
    <Link href="/inventory" className="group">
      <Card className="transition-colors group-hover:border-primary/40">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Valor em estoque</CardTitle>
          <Wallet className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-3xl font-semibold tabular-nums">{formatCents(inventoryValue.data?.total ?? 0)}</span>
            <ArrowRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

/** Sprint 3 Dashboard: ingredients consuming the most stock over the trailing 30 days. */
function TopConsumedCard() {
  const insights = useInventoryInsights()
  if (insights.isLoading || insights.isError || !insights.data || insights.data.topByQuantity.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Ingredientes mais consumidos (30 dias)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="divide-y">
          {insights.data.topByQuantity.slice(0, 5).map((item) => (
            <div key={item.ingredientId} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
              <p className="truncate text-sm font-medium">{item.ingredientName}</p>
              <span className="shrink-0 text-sm tabular-nums text-muted-foreground">{formatQuantity(item.totalConsumed, item.unit)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/** Sprint 3 Dashboard: active products still missing a ficha técnica. */
function ProductsWithoutRecipeCard() {
  const insights = useInventoryInsights()
  if (insights.isLoading || insights.isError || !insights.data || insights.data.productsWithoutRecipe === 0) return null

  return (
    <Link href="/products" className="group">
      <Card className="border-amber-500/40 transition-colors group-hover:border-amber-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Produtos sem ficha técnica</CardTitle>
          <TriangleAlert className="size-4 text-amber-600 dark:text-amber-500" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-3xl font-semibold tabular-nums">{insights.data.productsWithoutRecipe}</span>
            <ArrowRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function ChannelBreakdownCard({ canViewFinance }: { canViewFinance: boolean }) {
  const ordersToday = useDashboardOrdersToday()
  const byChannel = ordersToday.data?.byChannel
  if (ordersToday.isLoading || ordersToday.isError || !byChannel || Object.keys(byChannel).length === 0) return null
  const entries = Object.entries(byChannel).sort((a, b) => b[1].revenue - a[1].revenue)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Canais de venda hoje</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="divide-y">
          {entries.map(([channel, data]) => (
            <div key={channel} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
              <div className="flex items-center gap-2">
                {channel === "MARKETPLACE" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#ea1d2c]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#ea1d2c] leading-none">
                    <Store className="size-2.5" />
                    iFood
                  </span>
                )}
                <span className="text-sm font-medium">{ORDER_CHANNEL_LABEL[channel] ?? channel}</span>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-xs text-muted-foreground">{data.orders} pedido{data.orders !== 1 ? "s" : ""}</span>
                {canViewFinance && <span className="text-sm font-medium tabular-nums">{formatCents(data.revenue)}</span>}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function RecentOrdersCard() {
  const recentOrders = useRecentOrders(5)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium">Últimos pedidos</CardTitle>
        <Link href="/orders" className="text-xs text-muted-foreground hover:text-foreground">
          Ver todos
        </Link>
      </CardHeader>
      <CardContent>
        {recentOrders.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : recentOrders.isError ? (
          <p className="text-sm text-destructive">Erro ao carregar pedidos.</p>
        ) : recentOrders.data && recentOrders.data.items.length > 0 ? (
          <div className="divide-y">
            {recentOrders.data.items.map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0 hover:bg-muted/50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    #{order.number} — {order.customerName ?? "Cliente avulso"}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatRelative(order.createdAt)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-sm font-medium tabular-nums">{formatCents(order.grandTotal)}</span>
                  <StatusBadge status={order.status} config={ORDER_STATUS_CONFIG} />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">Nenhum pedido ainda.</p>
        )}
      </CardContent>
    </Card>
  )
}

function RecentActivityCard() {
  const movements = useRecentStockMovements(5)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Atividade recente no estoque</CardTitle>
      </CardHeader>
      <CardContent>
        {movements.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : movements.isError ? (
          <p className="text-sm text-destructive">Erro ao carregar movimentações.</p>
        ) : movements.data && movements.data.items.length > 0 ? (
          <div className="divide-y">
            {movements.data.items.map((movement) => (
              <div key={movement.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="flex min-w-0 items-center gap-2">
                  <Clock className="size-3.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{movement.ingredientName}</p>
                    <p className="text-xs text-muted-foreground">{formatRelative(movement.createdAt)}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {movement.quantityDelta > 0 ? "+" : ""}
                    {formatQuantity(movement.quantityDelta, movement.ingredientUnit)}
                  </span>
                  <StatusBadge status={movement.type} config={MOVEMENT_TYPE_CONFIG} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={Package} title="Nenhuma movimentação ainda" description="Entradas e saídas de insumos aparecerão aqui conforme os pedidos forem processados." />
        )}
      </CardContent>
    </Card>
  )
}

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH: "Dinheiro",
  CREDIT_CARD: "Crédito",
  DEBIT_CARD: "Débito",
  PIX: "PIX",
  VOUCHER: "Vale",
  GIFT_CARD: "Gift Card",
  ONLINE: "Online",
}

function RecentPaymentsCard() {
  const recentPayments = useDashboardRecentPayments(5)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium">Últimos pagamentos</CardTitle>
        <Link href="/finance" className="text-xs text-muted-foreground hover:text-foreground">
          Ver todos
        </Link>
      </CardHeader>
      <CardContent>
        {recentPayments.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : recentPayments.isError ? (
          <p className="text-sm text-destructive">Erro ao carregar pagamentos.</p>
        ) : recentPayments.data && recentPayments.data.items.length > 0 ? (
          <div className="divide-y">
            {recentPayments.data.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">Pedido #{item.orderNumber}</p>
                  <p className="text-xs text-muted-foreground">{formatRelative(item.paidAt ?? item.createdAt)}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  <span className="text-sm font-medium tabular-nums">{formatCents(item.amount)}</span>
                  <span className="text-xs text-muted-foreground">{PAYMENT_METHOD_LABEL[item.method] ?? item.method}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">Nenhum pagamento registrado.</p>
        )}
      </CardContent>
    </Card>
  )
}

function RecentCustomersCard() {
  const recentCustomers = useDashboardRecentCustomers(5)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium">Clientes recentes</CardTitle>
        <Link href="/customers" className="text-xs text-muted-foreground hover:text-foreground">
          Ver todos
        </Link>
      </CardHeader>
      <CardContent>
        {recentCustomers.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : recentCustomers.isError ? (
          <p className="text-sm text-destructive">Erro ao carregar clientes.</p>
        ) : recentCustomers.data && recentCustomers.data.items.length > 0 ? (
          <div className="divide-y">
            {recentCustomers.data.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.phone}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  <span className="text-xs text-muted-foreground">{formatRelative(item.createdAt)}</span>
                  <span className="text-xs text-muted-foreground">{item.totalOrders} pedido{item.totalOrders !== 1 ? "s" : ""}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">Nenhum cliente cadastrado.</p>
        )}
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const { session, activeMembership } = useAuth()
  const store = useStore()
  const counts = useDashboardCounts()
  const ordersToday = useDashboardOrdersToday()
  const canViewInventory = useCan("inventory:view")
  const canViewFinance = useCan("finance:view")
  const { settings: onboardingSettings } = useOnboardingSettings()
  const setTourPending = useSetTourPending()

  const firstName = session.user.name?.split(" ")[0] ?? "operador"

  const kpis: Kpi[] = [
    {
      label: "Pedidos hoje",
      value: ordersToday.data?.total,
      icon: ReceiptText,
      href: "/orders",
      isLoading: ordersToday.isLoading,
      isError: ordersToday.isError,
    },
    {
      label: "Cozinha ativa",
      value: counts.data?.kitchenActive,
      icon: ChefHat,
      href: "/kitchen",
      isLoading: counts.isLoading,
      isError: counts.isError,
    },
    {
      label: "Entregas ativas",
      value: counts.data?.activeDeliveries,
      icon: Truck,
      href: "/delivery",
      isLoading: counts.isLoading,
      isError: counts.isError,
    },
    {
      label: "Clientes",
      value: counts.data?.customers,
      icon: Users,
      href: "/customers",
      isLoading: counts.isLoading,
      isError: counts.isError,
    },
    {
      label: "Produtos ativos",
      value: counts.data?.activeProducts,
      icon: Package,
      href: "/products",
      isLoading: counts.isLoading,
      isError: counts.isError,
    },
  ]
  if (canViewFinance) {
    kpis.push({
      label: "Pagamentos pendentes",
      value: counts.data?.pendingPayments,
      icon: CreditCard,
      href: "/finance",
      isLoading: counts.isLoading,
      isError: counts.isError,
    })
  }

  return (
    <>
      <DashboardTour
        active={onboardingSettings.tourPending === true}
        onComplete={() => setTourPending(false)}
        onSkip={() => setTourPending(false)}
      />
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Olá, ${firstName}`}
        description="Visão geral das operações da sua loja em tempo real."
        actions={
          <LastUpdated
            dataUpdatedAt={ordersToday.dataUpdatedAt}
            isFetching={ordersToday.isFetching || counts.isFetching}
          />
        }
      />

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-3">
            {store.data?.logoUrl ? (
              <div className="relative size-10 shrink-0 overflow-hidden rounded-lg border">
                <Image src={store.data.logoUrl} alt={activeMembership.storeName} fill sizes="40px" className="object-cover" />
              </div>
            ) : (
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Store className="size-5" />
              </div>
            )}
            <div>
              <p className="text-sm font-medium">{activeMembership.storeName}</p>
              <p className="text-xs text-muted-foreground">
                Você está conectado como {session.user.email}
              </p>
            </div>
          </div>
          <Badge variant="secondary">{activeMembership.role.displayName}</Badge>
        </CardContent>
      </Card>

      {canViewFinance ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Receita hoje</CardTitle>
              <Wallet className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {ordersToday.isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : ordersToday.isError ? (
                <span className="text-sm text-destructive">Erro ao carregar</span>
              ) : (
                <span className="text-3xl font-semibold tabular-nums">{formatCents(ordersToday.data?.grossRevenue ?? 0)}</span>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Ticket médio hoje</CardTitle>
              <ReceiptText className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {ordersToday.isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : ordersToday.isError ? (
                <span className="text-sm text-destructive">Erro ao carregar</span>
              ) : (
                <span className="text-3xl font-semibold tabular-nums">{formatCents(ordersToday.data?.averageTicket ?? 0)}</span>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-tour="dashboard-kpis">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} kpi={kpi} />
        ))}
        <div data-tour="dashboard-stock-alerts">
          {canViewInventory ? <StockAlertsCard /> : null}
        </div>
        {canViewInventory ? <InventoryValueCard /> : null}
        {canViewInventory ? <ProductsWithoutRecipeCard /> : null}
      </div>

      <ChannelBreakdownCard canViewFinance={canViewFinance} />

      <div className="grid gap-4 lg:grid-cols-2" data-tour="dashboard-recent-orders">
        <RecentOrdersCard />
        {canViewInventory ? <RecentActivityCard /> : null}
      </div>

      {canViewInventory ? (
        <TopConsumedCard />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {canViewFinance ? <RecentPaymentsCard /> : null}
        <RecentCustomersCard />
      </div>
    </div>
    </>
  )
}
