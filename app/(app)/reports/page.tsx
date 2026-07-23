"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { toast } from "sonner"
import {
  Download, TrendingUp, ShoppingBag, Users, Banknote,
  Truck, ChefHat, PercentCircle, ArrowUpRight,
} from "lucide-react"

import { useCan, useActiveStoreId } from "@/features/auth"
import {
  useReportsOverview,
  useReportsSales,
  useReportsOrders,
  useReportsProducts,
  useReportsCustomers,
  useReportsDelivery,
  reportsApi,
  daysAgo,
  today,
} from "@/features/reports"
import { ORDER_CHANNEL_LABEL, ORDER_TYPE_LABEL } from "@/features/orders"
import { PAYMENT_METHOD_LABEL } from "@/features/payments"
import { PageHeader } from "@/components/app-shell/page-container"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ErrorState } from "@/components/shared"
import { formatCents } from "@/lib/format"

// recharts carregado de forma lazy
const ReportCharts = dynamic(() => import("./_report-charts"), {
  ssr: false,
  loading: () => <ChartsSkeleton />,
})

// ─── Skeletons ────────────────────────────────────────────────────────────

function ChartsSkeleton() {
  return (
    <>
      <Skeleton className="h-72 w-full" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
      <Skeleton className="h-64 w-full" />
    </>
  )
}

function CardsSkeleton({ n = 4 }: { n?: number }) {
  return (
    <>
      {Array.from({ length: n }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full" />
      ))}
    </>
  )
}

// ─── Presets ──────────────────────────────────────────────────────────────

const PRESETS = [
  { label: "Hoje",    days: 0  },
  { label: "7 dias",  days: 6  },
  { label: "30 dias", days: 29 },
  { label: "90 dias", days: 89 },
] as const

// ─── Shared UI ────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  icon: Icon,
  sub,
}: {
  label: string
  value: string
  icon: React.ElementType
  sub?: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-background p-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="size-5 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold tabular-nums leading-tight">{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      {children}
    </div>
  )
}

function BreakdownRow({
  label,
  count,
  revenue,
}: {
  label: string
  count: number
  revenue?: number
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-background px-4 py-2.5">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-4 text-sm tabular-nums text-muted-foreground">
        <span>{count} ped.</span>
        {revenue !== undefined && (
          <span className="font-medium text-foreground">{formatCents(revenue)}</span>
        )}
      </div>
    </div>
  )
}

// ─── Tab: Visão Geral ─────────────────────────────────────────────────────

function TabOverview({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  const overview = useReportsOverview({ dateFrom, dateTo })
  const d = overview.data

  if (overview.isError) {
    return <ErrorState error={overview.error} onRetry={() => overview.refetch()} />
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {overview.isLoading ? (
          <CardsSkeleton />
        ) : (
          <>
            <MetricCard label="Receita total"    value={formatCents(d?.summary.totalRevenue  ?? 0)} icon={Banknote}    />
            <MetricCard label="Total de pedidos" value={String(d?.summary.totalOrders         ?? 0)} icon={ShoppingBag} />
            <MetricCard label="Ticket médio"     value={formatCents(d?.summary.averageTicket ?? 0)} icon={TrendingUp}  />
            <MetricCard label="Novos clientes"   value={String(d?.summary.newCustomers        ?? 0)} icon={Users}       />
          </>
        )}
      </div>

      {overview.isLoading ? (
        <ChartsSkeleton />
      ) : d ? (
        <ReportCharts d={d} />
      ) : null}
    </>
  )
}

// ─── Tab: Vendas ──────────────────────────────────────────────────────────

function TabSales({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  const sales = useReportsSales({ dateFrom, dateTo, groupBy: "day" })
  const d = sales.data

  if (sales.isError) return <ErrorState error={sales.error} onRetry={() => sales.refetch()} />

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {sales.isLoading ? (
          <CardsSkeleton n={3} />
        ) : (
          <>
            <MetricCard label="Receita total"   value={formatCents(d?.totals.revenue ?? 0)}    icon={Banknote}    />
            <MetricCard label="Total de pedidos" value={String(d?.totals.orderCount ?? 0)}     icon={ShoppingBag} />
            <MetricCard
              label="Ticket médio"
              value={
                d && d.totals.orderCount > 0
                  ? formatCents(Math.round(d.totals.revenue / d.totals.orderCount))
                  : "—"
              }
              icon={TrendingUp}
            />
          </>
        )}
      </div>

      <Section title="Receita por dia">
        {sales.isLoading ? (
          <Skeleton className="h-56 w-full" />
        ) : d && d.series.length > 0 ? (
          <div className="divide-y rounded-xl border bg-background">
            {d.series.map((row) => (
              <div key={row.date} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="tabular-nums text-muted-foreground">{row.date}</span>
                <div className="flex items-center gap-4 tabular-nums">
                  <span className="text-muted-foreground">{row.orderCount} ped.</span>
                  <span className="font-medium">{formatCents(row.revenue)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Sem dados no período.</p>
        )}
      </Section>
    </div>
  )
}

// ─── Tab: Pedidos ─────────────────────────────────────────────────────────

function TabOrders({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  const orders = useReportsOrders({ dateFrom, dateTo })
  const d = orders.data

  if (orders.isError) return <ErrorState error={orders.error} onRetry={() => orders.refetch()} />

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {orders.isLoading ? (
          <CardsSkeleton n={3} />
        ) : (
          <>
            <MetricCard
              label="Taxa de cancelamento"
              value={d ? `${d.cancellationRate}%` : "—"}
              icon={PercentCircle}
            />
            <MetricCard
              label="Tempo médio preparo"
              value={d?.averagePreparationMinutes != null ? `${d.averagePreparationMinutes} min` : "—"}
              icon={ChefHat}
            />
            <MetricCard
              label="Tempo médio entrega"
              value={d?.averageDeliveryMinutes != null ? `${d.averageDeliveryMinutes} min` : "—"}
              icon={Truck}
            />
          </>
        )}
      </div>

      {orders.isLoading ? (
        <CardsSkeleton n={2} />
      ) : d ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Section title="Por tipo">
            <div className="flex flex-col gap-1">
              {Object.entries(d.byType).map(([type, v]) => (
                <BreakdownRow
                  key={type}
                  label={(ORDER_TYPE_LABEL as Record<string, string>)[type] ?? type}
                  count={v.count}
                  revenue={v.revenue}
                />
              ))}
            </div>
          </Section>
          <Section title="Por canal">
            <div className="flex flex-col gap-1">
              {Object.entries(d.byChannel).map(([ch, v]) => (
                <BreakdownRow
                  key={ch}
                  label={ORDER_CHANNEL_LABEL[ch] ?? ch}
                  count={v.count}
                  revenue={v.revenue}
                />
              ))}
            </div>
          </Section>
        </div>
      ) : null}
    </div>
  )
}

// ─── Tab: Produtos ────────────────────────────────────────────────────────

function TabProducts({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  const [page, setPage] = React.useState(1)
  const products = useReportsProducts({ dateFrom, dateTo, page })
  const d = products.data

  if (products.isError) return <ErrorState error={products.error} onRetry={() => products.refetch()} />

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border bg-background">
        {/* Header */}
        <div className="grid grid-cols-[1fr_80px_100px_80px] gap-2 border-b px-4 py-2 text-xs font-medium text-muted-foreground">
          <span>Produto</span>
          <span className="text-right">Qtd</span>
          <span className="text-right">Receita</span>
          <span className="text-right">Share</span>
        </div>

        {products.isLoading ? (
          <div className="flex flex-col gap-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : d && d.items.length > 0 ? (
          <div className="divide-y">
            {d.items.map((item) => (
              <div
                key={item.productId}
                className="grid grid-cols-[1fr_80px_100px_80px] items-center gap-2 px-4 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm">{item.productName}</p>
                  {item.categoryName && (
                    <p className="truncate text-xs text-muted-foreground">{item.categoryName}</p>
                  )}
                </div>
                <span className="text-right text-sm tabular-nums">{item.quantitySold}</span>
                <span className="text-right text-sm font-medium tabular-nums">{formatCents(item.revenue)}</span>
                <span className="text-right text-sm tabular-nums text-muted-foreground">{item.revenueShare}%</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="px-4 py-6 text-sm text-muted-foreground">Sem dados no período.</p>
        )}
      </div>

      {d && d.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Página {d.pagination.page} de {d.pagination.totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!d.pagination.hasNextPage}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tab: Clientes ────────────────────────────────────────────────────────

function TabCustomers({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  const customers = useReportsCustomers({ dateFrom, dateTo })
  const d = customers.data

  if (customers.isError) return <ErrorState error={customers.error} onRetry={() => customers.refetch()} />

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {customers.isLoading ? (
          <CardsSkeleton />
        ) : (
          <>
            <MetricCard label="Total de clientes"  value={String(d?.totalActive ?? 0)}              icon={Users}          />
            <MetricCard label="Novos no período"    value={String(d?.newInPeriod ?? 0)}              icon={ArrowUpRight}   />
            <MetricCard label="Retornaram"          value={String(d?.returningInPeriod ?? 0)}        icon={Users}          />
            <MetricCard label="Taxa de retenção"    value={d ? `${d.repeatPurchaseRate}%` : "—"}     icon={PercentCircle}  />
          </>
        )}
      </div>

      <Section title="Top clientes por gasto">
        {customers.isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : d && d.topCustomers.length > 0 ? (
          <div className="divide-y rounded-xl border bg-background">
            {d.topCustomers.map((c, i) => (
              <div key={c.customerId} className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                    {i + 1}
                  </span>
                  <span className="text-sm">{c.name}</span>
                </div>
                <div className="flex items-center gap-4 text-sm tabular-nums text-muted-foreground">
                  <span>{c.orderCount} ped.</span>
                  <span className="font-medium text-foreground">{formatCents(c.totalSpent)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Sem dados no período.</p>
        )}
      </Section>
    </div>
  )
}

// ─── Tab: Entregas ────────────────────────────────────────────────────────

const PLATFORM_LABEL: Record<string, string> = {
  INTERNAL:  "Própria",
  IFOOD:     "iFood",
  RAPPI:     "Rappi",
  UBER_EATS: "Uber Eats",
  LOGGI:     "Loggi",
  OTHER:     "Outro",
}

function TabDelivery({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  const delivery = useReportsDelivery({ dateFrom, dateTo })
  const d = delivery.data

  if (delivery.isError) return <ErrorState error={delivery.error} onRetry={() => delivery.refetch()} />

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {delivery.isLoading ? (
          <CardsSkeleton />
        ) : (
          <>
            <MetricCard label="Total de entregas"   value={String(d?.totalDeliveries ?? 0)}                                 icon={Truck}         />
            <MetricCard label="Taxa de sucesso"      value={d ? `${d.successRate}%` : "—"}                                  icon={PercentCircle} />
            <MetricCard label="Tempo médio despacho" value={d?.averageDispatchMinutes != null ? `${d.averageDispatchMinutes} min` : "—"} icon={ChefHat}       />
            <MetricCard label="Tempo médio entrega"  value={d?.averageDeliveryMinutes != null ? `${d.averageDeliveryMinutes} min` : "—"} icon={TrendingUp}    />
          </>
        )}
      </div>

      {delivery.isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : d ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Section title="Resultado">
            <div className="flex flex-col gap-1">
              {[
                { label: "Entregues",   value: d.delivered },
                { label: "Falhas",      value: d.failed    },
                { label: "Retornadas",  value: d.returned  },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between rounded-lg border bg-background px-4 py-2.5">
                  <span className="text-sm">{row.label}</span>
                  <span className="text-sm tabular-nums font-medium">{row.value}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Por plataforma">
            <div className="flex flex-col gap-1">
              {Object.entries(d.byPlatform).map(([platform, v]) => (
                <div key={platform} className="flex items-center justify-between rounded-lg border bg-background px-4 py-2.5">
                  <span className="text-sm">{PLATFORM_LABEL[platform] ?? platform}</span>
                  <div className="flex items-center gap-3 text-sm tabular-nums text-muted-foreground">
                    <span>{v.count} ent.</span>
                    <span className="font-medium text-foreground">{v.successRate}%</span>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>
      ) : null}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const storeId   = useActiveStoreId()
  const canExport = useCan("reports:export")

  const [preset,    setPreset]    = React.useState<number>(29)
  const [dateFrom,  setDateFrom]  = React.useState(() => daysAgo(29))
  const [dateTo,    setDateTo]    = React.useState(() => today())
  const [activeTab, setActiveTab] = React.useState("overview")
  const [exporting, setExporting] = React.useState(false)

  const applyPreset = (days: number) => {
    setPreset(days)
    setDateFrom(daysAgo(days))
    setDateTo(today())
  }

  const applyCustom = (from: string, to: string) => {
    setPreset(-1)
    if (from) setDateFrom(from)
    if (to)   setDateTo(to)
  }

  const handleExport = async () => {
    if (!canExport || !storeId) return
    setExporting(true)
    try {
      const data = await reportsApi.overview(storeId, { dateFrom, dateTo })

      const rows = [
        ["Relatório de vendas — " + dateFrom + " a " + dateTo],
        [],
        ["Resumo"],
        ["Receita total",    (data.summary.totalRevenue  / 100).toFixed(2).replace(".", ",")],
        ["Total de pedidos", String(data.summary.totalOrders)],
        ["Ticket médio",     (data.summary.averageTicket / 100).toFixed(2).replace(".", ",")],
        ["Novos clientes",   String(data.summary.newCustomers)],
        [],
        ["Receita por dia"],
        ["Data", "Receita (R$)", "Pedidos"],
        ...data.revenueByDay.map((r) => [r.date, (r.revenue / 100).toFixed(2).replace(".", ","), String(r.orders)]),
        [],
        ["Top produtos"],
        ["Produto", "Qtd vendida", "Receita (R$)"],
        ...data.topProducts.map((p) => [p.name, String(p.quantity), (p.revenue / 100).toFixed(2).replace(".", ",")]),
        [],
        ["Pedidos por canal"],
        ["Canal", "Pedidos", "Receita (R$)"],
        ...data.byChannel.map((c) => [ORDER_CHANNEL_LABEL[c.channel] ?? c.channel, String(c.orders), (c.revenue / 100).toFixed(2).replace(".", ",")]),
        [],
        ["Pagamentos por método"],
        ["Método", "Transações", "Total (R$)"],
        ...data.byPaymentMethod.map((p) => [PAYMENT_METHOD_LABEL[p.method] ?? p.method, String(p.count), (p.total / 100).toFixed(2).replace(".", ",")]),
      ]

      const csv  = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";")).join("\n")
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
      const url  = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href     = url
      link.download = `relatorio-${dateFrom}-${dateTo}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error("Erro ao exportar relatório.")
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Relatórios"
        description="Análise de desempenho por período."
        actions={
          canExport ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={exporting}
            >
              <Download data-icon="inline-start" />
              {exporting ? "Exportando…" : "Exportar CSV"}
            </Button>
          ) : undefined
        }
      />

      {/* Controles de data — compartilhados entre todas as abas */}
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => (
          <Button
            key={p.days}
            variant={preset === p.days ? "default" : "outline"}
            size="sm"
            onClick={() => applyPreset(p.days)}
          >
            {p.label}
          </Button>
        ))}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span className="hidden sm:inline">ou</span>
          <input
            type="date"
            value={dateFrom}
            max={dateTo}
            onChange={(e) => applyCustom(e.target.value, dateTo)}
            className="h-8 rounded-md border bg-background px-2 text-xs tabular-nums"
          />
          <span>—</span>
          <input
            type="date"
            value={dateTo}
            min={dateFrom}
            max={today()}
            onChange={(e) => applyCustom(dateFrom, e.target.value)}
            className="h-8 rounded-md border bg-background px-2 text-xs tabular-nums"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-2 w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="sales">Vendas</TabsTrigger>
          <TabsTrigger value="orders">Pedidos</TabsTrigger>
          <TabsTrigger value="products">Produtos</TabsTrigger>
          <TabsTrigger value="customers">Clientes</TabsTrigger>
          <TabsTrigger value="delivery">Entregas</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <TabOverview dateFrom={dateFrom} dateTo={dateTo} />
        </TabsContent>

        <TabsContent value="sales">
          <TabSales dateFrom={dateFrom} dateTo={dateTo} />
        </TabsContent>

        <TabsContent value="orders">
          <TabOrders dateFrom={dateFrom} dateTo={dateTo} />
        </TabsContent>

        <TabsContent value="products">
          <TabProducts dateFrom={dateFrom} dateTo={dateTo} />
        </TabsContent>

        <TabsContent value="customers">
          <TabCustomers dateFrom={dateFrom} dateTo={dateTo} />
        </TabsContent>

        <TabsContent value="delivery">
          <TabDelivery dateFrom={dateFrom} dateTo={dateTo} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
