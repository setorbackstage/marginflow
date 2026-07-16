"use client"

/**
 * Componente de gráficos carregado de forma lazy via next/dynamic.
 * Mantido em arquivo separado para que recharts (~500 KB) não entre no
 * bundle inicial de nenhuma outra página — só é baixado quando o usuário
 * abre /reports.
 */

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts"

import type { ReportsOverview } from "@/features/reports"
import { ORDER_CHANNEL_LABEL } from "@/features/orders"
import { PAYMENT_METHOD_LABEL } from "@/features/payments"
import { shortDate } from "@/features/reports"
import { formatCents } from "@/lib/format"

// ─── Chart colours ─────────────────────────────────────────────────────────

const CHART_COLORS = ["#6366f1", "#f59e0b", "#10b981", "#3b82f6", "#ef4444", "#8b5cf6", "#ec4899"]

// ─── Tooltips ──────────────────────────────────────────────────────────────

function RevenueTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { value: number; name: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-muted-foreground">
          {p.name === "revenue" ? "Receita" : "Pedidos"}:{" "}
          <span className="font-semibold text-foreground">
            {p.name === "revenue" ? formatCents(p.value) : p.value}
          </span>
        </p>
      ))}
    </div>
  )
}

function PieTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: { name: string; value: number; payload: { total?: number; revenue?: number } }[]
}) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  const money = item.payload.total ?? item.payload.revenue
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium">{item.name}</p>
      {money !== undefined && (
        <p className="text-muted-foreground">
          Valor: <span className="font-semibold text-foreground">{formatCents(money)}</span>
        </p>
      )}
      <p className="text-muted-foreground">
        Qtd: <span className="font-semibold text-foreground">{item.value}</span>
      </p>
    </div>
  )
}

// ─── Public component ───────────────────────────────────────────────────────

interface ReportChartsProps {
  d: ReportsOverview
}

export default function ReportCharts({ d }: ReportChartsProps) {
  const channelPie = d.byChannel.map((c) => ({
    name:    ORDER_CHANNEL_LABEL[c.channel] ?? c.channel,
    value:   c.orders,
    revenue: c.revenue,
  }))

  const paymentPie = d.byPaymentMethod.map((p) => ({
    name:  PAYMENT_METHOD_LABEL[p.method] ?? p.method,
    value: p.count,
    total: p.total,
  }))

  return (
    <>
      {/* Revenue over time */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Receita por dia</h2>
        <div className="rounded-xl border bg-background p-4">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={d.revenueByDay.map((r) => ({ ...r, label: shortDate(r.date) }))}
              barSize={12}
            >
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
      </section>

      {/* Channel + Payment method breakdown */}
      <div className="grid gap-4 sm:grid-cols-2">
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">Pedidos por canal</h2>
          {channelPie.length === 0 ? (
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
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">Pagamentos por método</h2>
          {paymentPie.length === 0 ? (
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
        </section>
      </div>

      {/* Top products */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Top 10 produtos por receita</h2>
        {!d.topProducts.length ? (
          <div className="flex h-32 items-center justify-center rounded-xl border text-sm text-muted-foreground">
            Nenhum dado no período.
          </div>
        ) : (
          <div className="rounded-xl border bg-background p-4">
            <ResponsiveContainer
              width="100%"
              height={Math.max(180, d.topProducts.length * 32 + 20)}
            >
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
      </section>
    </>
  )
}
