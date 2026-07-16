"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { toast } from "sonner"
import { Download, TrendingUp, ShoppingBag, Users, Banknote } from "lucide-react"

import { useCan, useActiveStoreId } from "@/features/auth"
import { useReportsOverview, reportsApi, daysAgo, today } from "@/features/reports"
import { ORDER_CHANNEL_LABEL } from "@/features/orders"
import { PAYMENT_METHOD_LABEL } from "@/features/payments"
import { PageHeader } from "@/components/app-shell/page-container"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ErrorState } from "@/components/shared"
import { formatCents } from "@/lib/format"

// recharts (~500 KB) carregado de forma lazy — não entra no bundle inicial.
// Só é baixado quando o componente de gráficos precisa ser renderizado.
const ReportCharts = dynamic(() => import("./_report-charts"), {
  ssr: false,
  loading: () => <ChartsSkeleton />,
})

// ─── Skeleton para os gráficos enquanto o chunk carrega ───────────────────

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

// ─── Date preset ──────────────────────────────────────────────────────────

const PRESETS = [
  { label: "7 dias",  days: 6  },
  { label: "30 dias", days: 29 },
  { label: "90 dias", days: 89 },
] as const

// ─── Summary card ─────────────────────────────────────────────────────────

function SummaryCard({
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

// ─── Page ─────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const storeId   = useActiveStoreId()
  const canExport = useCan("reports:export")

  const [preset,    setPreset]    = React.useState<number>(29)
  const [dateFrom,  setDateFrom]  = React.useState(() => daysAgo(29))
  const [dateTo,    setDateTo]    = React.useState(() => today())
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

      const dayHeader = ["Data", "Receita (R$)", "Pedidos"]
      const dayRows   = data.revenueByDay.map((r) => [
        r.date,
        (r.revenue / 100).toFixed(2).replace(".", ","),
        String(r.orders),
      ])

      const prodHeader = ["Produto", "Qtd vendida", "Receita (R$)"]
      const prodRows   = data.topProducts.map((p) => [
        p.name,
        String(p.quantity),
        (p.revenue / 100).toFixed(2).replace(".", ","),
      ])

      // Flatten channel/payment breakdowns for the CSV
      const channelHeader = ["Canal", "Pedidos", "Receita (R$)"]
      const channelRows   = data.byChannel.map((c) => [
        ORDER_CHANNEL_LABEL[c.channel] ?? c.channel,
        String(c.orders),
        (c.revenue / 100).toFixed(2).replace(".", ","),
      ])

      const paymentHeader = ["Método de pagamento", "Transações", "Total (R$)"]
      const paymentRows   = data.byPaymentMethod.map((p) => [
        PAYMENT_METHOD_LABEL[p.method] ?? p.method,
        String(p.count),
        (p.total / 100).toFixed(2).replace(".", ","),
      ])

      const rows = [
        ["Relatório de vendas — " + dateFrom + " a " + dateTo],
        [],
        ["Resumo"],
        ["Receita total",   (data.summary.totalRevenue / 100).toFixed(2).replace(".", ",")],
        ["Total de pedidos", String(data.summary.totalOrders)],
        ["Ticket médio",    (data.summary.averageTicket / 100).toFixed(2).replace(".", ",")],
        ["Novos clientes",   String(data.summary.newCustomers)],
        [],
        ["Receita por dia"],
        dayHeader,
        ...dayRows,
        [],
        ["Top produtos"],
        prodHeader,
        ...prodRows,
        [],
        ["Pedidos por canal"],
        channelHeader,
        ...channelRows,
        [],
        ["Pagamentos por método"],
        paymentHeader,
        ...paymentRows,
      ]

      const csv  = rows
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
              disabled={exporting || overview.isLoading}
            >
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
          {/* Summary cards — renderizados imediatamente, sem recharts */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {overview.isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
            ) : (
              <>
                <SummaryCard label="Receita total"    value={formatCents(d?.summary.totalRevenue  ?? 0)} icon={Banknote}    />
                <SummaryCard label="Total de pedidos" value={String(d?.summary.totalOrders         ?? 0)} icon={ShoppingBag} />
                <SummaryCard label="Ticket médio"     value={formatCents(d?.summary.averageTicket ?? 0)} icon={TrendingUp}  />
                <SummaryCard label="Novos clientes"   value={String(d?.summary.newCustomers        ?? 0)} icon={Users}       />
              </>
            )}
          </div>

          {/* Gráficos — chunk separado, carregado de forma lazy */}
          {overview.isLoading ? (
            <ChartsSkeleton />
          ) : d ? (
            <ReportCharts d={d} />
          ) : null}
        </>
      )}
    </div>
  )
}
