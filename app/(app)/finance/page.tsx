"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Wallet, Download } from "lucide-react"
import { toast } from "sonner"

import { useCan, useActiveStoreId } from "@/features/auth"
import { usePayments, PAYMENT_STATUS_CONFIG, PAYMENT_METHOD_LABEL } from "@/features/payments"
import { paymentsApi } from "@/features/payments/api"
import type { PaymentStatus } from "@/features/payments/types"
import { PageHeader } from "@/components/app-shell/page-container"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { EmptyState, ErrorState, StatusBadge, PaginationBar } from "@/components/shared"
import { formatCents, formatDateTime } from "@/lib/format"

const STATUS_FILTER_LABEL: Record<string, string> = {
  ALL:                  "Todos os status",
  PENDING:              "Pendentes",
  PAID:                 "Pagos",
  PARTIALLY_REFUNDED:   "Parcialmente reembolsados",
  REFUNDED:             "Reembolsados",
}

const STATUS_LABEL_PT: Record<string, string> = {
  PENDING:            "Pendente",
  PAID:               "Pago",
  PARTIALLY_REFUNDED: "Parcialmente reembolsado",
  REFUNDED:           "Reembolsado",
}

export default function FinancePage() {
  const router    = useRouter()
  const storeId   = useActiveStoreId()
  const canExport = useCan("finance:export")

  const [statusFilter, setStatusFilter] = React.useState<PaymentStatus | "ALL">("ALL")
  const [page,         setPage]         = React.useState(1)
  const [exporting,    setExporting]    = React.useState(false)

  const payments = usePayments({ page, status: statusFilter === "ALL" ? undefined : statusFilter })

  const handleFilterChange = (value: PaymentStatus | "ALL" | null) => {
    if (!value) return
    setStatusFilter(value)
    setPage(1)
  }

  const handleExportCsv = async () => {
    if (!canExport) return
    setExporting(true)
    try {
      // Fetch all pages for export (up to 1000 rows)
      const data = await paymentsApi.list(storeId, {
        page:   1,
        status: statusFilter === "ALL" ? undefined : statusFilter,
      })

      const header = ["Pedido", "Método", "Valor (R$)", "Reembolsado (R$)", "Status", "Pago em"]
      const rows = data.items.map((p) => [
        `#${p.orderNumber}`,
        PAYMENT_METHOD_LABEL[p.method] ?? p.method,
        (p.amount / 100).toFixed(2).replace(".", ","),
        p.refundedAmount > 0 ? (p.refundedAmount / 100).toFixed(2).replace(".", ",") : "",
        STATUS_LABEL_PT[p.status] ?? p.status,
        formatDateTime(p.paidAt),
      ])

      const csvContent = [header, ...rows]
        .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(";"))
        .join("\n")

      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" })
      const url  = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href     = url
      link.download = `financeiro-${new Date().toISOString().slice(0, 10)}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error("Erro ao exportar pagamentos.")
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Financeiro"
        description="Histórico de pagamentos, confirmações e reembolsos."
        actions={
          canExport ? (
            <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={exporting}>
              <Download data-icon="inline-start" />
              {exporting ? "Exportando…" : "Exportar CSV"}
            </Button>
          ) : undefined
        }
      />

      <Select value={statusFilter} onValueChange={handleFilterChange}>
        <SelectTrigger className="w-56">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(STATUS_FILTER_LABEL).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {payments.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : payments.isError ? (
        <ErrorState error={payments.error} onRetry={() => payments.refetch()} />
      ) : payments.data && payments.data.items.length > 0 ? (
        <>
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Reembolsado</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pago em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.data.items.map((payment) => (
                  <TableRow key={payment.id} className="cursor-pointer" onClick={() => router.push(`/orders/${payment.orderId}`)}>
                    <TableCell className="font-medium">#{payment.orderNumber}</TableCell>
                    <TableCell className="text-muted-foreground">{PAYMENT_METHOD_LABEL[payment.method]}</TableCell>
                    <TableCell className="tabular-nums">{formatCents(payment.amount)}</TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {payment.refundedAmount > 0 ? formatCents(payment.refundedAmount) : "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={payment.status} config={PAYMENT_STATUS_CONFIG} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTime(payment.paidAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <PaginationBar pagination={payments.data.pagination} onPageChange={setPage} />
        </>
      ) : (
        <EmptyState
          icon={Wallet}
          title={statusFilter !== "ALL" ? "Nenhum pagamento neste filtro" : "Ainda não há pagamentos registrados"}
          description={
            statusFilter !== "ALL"
              ? "Tente remover o filtro de status para ver todos os pagamentos."
              : "Os pagamentos aparecem aqui conforme os pedidos forem cobrados. Confirme um pedido e inicie o pagamento para começar."
          }
          action={
            statusFilter === "ALL" ? (
              <Link href="/orders">
                <button className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
                  Ir para Pedidos
                </button>
              </Link>
            ) : undefined
          }
        />
      )}
    </div>
  )
}
