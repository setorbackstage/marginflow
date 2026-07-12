"use client"

import * as React from "react"
import { toast } from "sonner"
import { Download, TrendingUp, ShoppingBag, Users, Banknote } from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts"

import { useCan, useActiveStoreId } from "@/features/auth"
import { useReportsOverview, reportsApi, daysAgo, today, shortDate } from "@/features/reports"
import { ORDER_CHANNEL_LABEL } from "@/features/orders"
import { PAYMENT_METHOD_LABEL } from "@/features/payments"
import { PageHeader } from "@/components/app-shell/page-container"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ErrorState } from "@/components/shared"
import { formatCents } from "@/lib/format"
import { cn } from "@/lib/utils"

// ─── Date preset ─────────────────────────────────────────────────────────────

const PRESETS = [
  { label: "7 dias",  days: 6  },
  { label: "30 dias", days: 29 },
  { label: "90 dias", days: 89 },
] as const

// ─── Chart colours ────────────────────────────────────────────────────────────

const CHART_COLORS = ["#6366f1", "#f59e0b", "#10b981", "#3b82f6", "#ef4444", "#8b5cf6", "#ec4899"]

// ─── Summary card ─────────────────────────────────────────────────────────────

function SummaryCard({ label, value, icon: Icon, sub }: { label: string; value: string; icon: React.ElementType; sub?: string }) {
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

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold">{title}</h2>
      {children}
    </section>
  )
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

function RevenueTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-muted-foreground">
          {p.name === "revenue" ? "Receita" : "Pedidos"}: <span className="font-semibold text-foreground">
            {p.name === "revenue" ? formatCents(p.value) : p.value}
          </span>
        </p>
      ))}
    </div>
  )
}

function PieTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: { total?: number; revenue?: number } }[] }) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  const money = item.payload.total ?? item.payload.revenue
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium">{item.name}</p>
      {money !== undefined && (
        <p className="text-muted-foreground">Valor: <span className="font-semibold text-foreground">{formatCents(money)}</span></p>
      )}
      <p className="text-muted-foreground">Qtd: <span className="font-semibold text-foreground">{item.value}</span></p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const storeId   = useActiveStoreId()
  const canExport = useCan("reports:export")

  const [preset,   setPreset]   = React.useState<number>(29)
  const [dateFrom, setDateFrom] = React.useState(() => daysAgo(29))
  const [dateTo,   setDateTo]   = React.useState(() => today())
  const [exporting, setExporting] = React.useState(false)

  const overview = useReportsOverview({ dateFrom, dateTo })

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

      // Revenue by day sheet
      const dayHeader = ["Data", "Receita (R$)", "Pedidos"]
      const dayRows = data.revenueByDay.map((r) => [r.date, (r.revenue / 100).toFixed(2).replace(".", ","), String(r.orders)])

      // Top products sheet
      const prodHeader = ["Produto", "Qtd vendida", "Receita (R$)"]
      const prodRows = data.topProducts.map((p) => [p.name, String(p.quantity), (p.revenue / 100).toFixed(2).replace(".", ",")])

      const rows = [
        ["Relatório de vendas — " + dateFrom + " a " + dateTo],
        [],
        ["Resumo"],
        ["Receita total", (data.summary.totalRevenue / 100).toFixed(2).replace(".", ",")],
        ["Total de pedidos", String(data.summary.totalOrders)],
        ["Ticket médio", (data.summary.averageTicket / 100).toFixed(2).replace(".", ",")],
        ["Novos clientes", String(data.summary.newCustomers)],
        [],
        ["Receita por dia"],
        dayHeader,
        ...dayRows,
        [],
        ["Top produtos"],
        prodHeader,
        ...prodRows,
      ]

      const csv = rows
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
        .join("\n")
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

  const d = overview.data

  // Channel pie data
  const channelPie = (d?.byChannel ?? []).map((c) => ({
    name:    ORDER_CHANNEL_LABEL[c.channel] ?? c.channel,
    value:   c.orders,
    revenue: c.revenue,
  }))

  // Payment method pie data
  const paymentPie = (d?.byPaymentMethod ?? []).map((p) => ({
    name:  PAYMENT_METHOD_LABEL[p.method] ?? p.method,
    value: p.count,
    total: p.total,
  }))

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Relatórios"
        description="Análise de desempenho por período."
        actions={
          canExport ? (
            <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting || overview.isLoading}>
              <Download data-icon="inline-start" />
              {exporting ? "Exportando…" : "Exportar CSV"}
            </Button>
          ) : undefined
        }
      />

      {/* Date range controls */}
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

      {overview.isError ? (
        <ErrorState error={overview.error} onRetry={() => overview.refetch()} />
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {overview.isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
            ) : (
              <>
                <SummaryCard label="Receita total"   value={formatCents(d?.summary.totalRevenue ?? 0)}  icon={Banknote}    />
                <SummaryCard label="Total de pedidos" value={String(d?.summary.totalOrders ?? 0)}        icon={ShoppingBag} />
                <SummaryCard label="Ticket médio"     value={formatCents(d?.summary.averageTicket ?? 0)} icon={TrendingUp}  />
                <SummaryCard label="Novos clientes"   value={String(d?.summary.newCustomers ?? 0)}       icon={Users}       />
              </>
            )}
          </div>

          {/* Revenue over time */}
          <Section title="Receita por dia">
            {overview.isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <div className="rounded-xl border bg-background p-4">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={d?.revenueByDay.map((r) => ({ ...r, label: shortDate(r.date) })) ?? []} barSize={12}>
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tickFormatter={(v: number) => `R$${(v / 100).toFixed(0)}`}
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={56}
                    />
                    <Tooltip content={<RevenueTooltip />} />
                    <Bar dataKey="revenue" name="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Section>

          {/* Channel + Payment method breakdown */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Section title="Pedidos por canal">
              {overview.isLoading ? (
                <Skeleton className="h-52 w-full" />
              ) : channelPie.length === 0 ? (
                <div className="flex h-52 items-center justify-center rounded-xl border text-sm text-muted-foreground">
                  Nenhum dado no período.
                </div>
              ) : (
                <div className="rounded-xl border bg-background p-4">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={channelPie}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        innerRadius={40}
                        paddingAngle={2}
                      >
                        {channelPie.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Section>

            <Section title="Pagamentos por método">
              {overview.isLoading ? (
                <Skeleton className="h-52 w-full" />
              ) : paymentPie.length === 0 ? (
                <div className="flex h-52 items-center justify-center rounded-xl border text-sm text-muted-foreground">
                  Nenhum dado no período.
                </div>
              ) : (
                <div className="rounded-xl border bg-background p-4">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={paymentPie}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        innerRadius={40}
                        paddingAngle={2}
                      >
                        {paymentPie.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Section>
          </div>

          {/* Top products */}
          <Section title="Top 10 produtos por receita">
            {overview.isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : !d?.topProducts.length ? (
              <div className="flex h-32 items-center justify-center rounded-xl border text-sm text-muted-foreground">
                Nenhum dado no período.
              </div>
            ) : (
              <div className="rounded-xl border bg-background p-4">
                <ResponsiveContainer width="100%" height={Math.max(180, (d.topProducts.length * 32) + 20)}>
                  <BarChart
                    data={d.topProducts.map((p) => ({
                      name:    p.name.length > 28 ? p.name.slice(0, 26) + "…" : p.name,
                      revenue: p.revenue,
                      qty:     p.quantity,
                    }))}
                    layout="vertical"
                    margin={{ left: 8, right: 16 }}
                    barSize={14}
                  >
                    <XAxis
                      type="number"
                      tickFormatter={(v: number) => `R$${(v / 100).toFixed(0)}`}
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      width={120}
                    />
                    <Tooltip
                      formatter={(value) => formatCents(Number(value))}
                      labelStyle={{ fontSize: 11 }}
                      contentStyle={{ fontSize: 11 }}
                    />
                    <Bar dataKey="revenue" name="Receita" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Section>
        </>
      )}
    </div>
  )
}
