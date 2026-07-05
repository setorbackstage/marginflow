"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Wallet } from "lucide-react"

import { usePayments, PAYMENT_STATUS_CONFIG, PAYMENT_METHOD_LABEL } from "@/features/payments"
import type { PaymentStatus } from "@/features/payments/types"
import { PageHeader } from "@/components/app-shell/page-container"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { EmptyState, ErrorState, StatusBadge, PaginationBar } from "@/components/shared"
import { formatCents, formatDateTime } from "@/lib/format"

const STATUS_FILTER_LABEL: Record<string, string> = {
  ALL: "Todos os status",
  PENDING: "Pendentes",
  PAID: "Pagos",
  PARTIALLY_REFUNDED: "Parcialmente reembolsados",
  REFUNDED: "Reembolsados",
}

export default function FinancePage() {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = React.useState<PaymentStatus | "ALL">("ALL")
  const [page, setPage] = React.useState(1)

  const payments = usePayments({ page, status: statusFilter === "ALL" ? undefined : statusFilter })

  const handleFilterChange = (value: PaymentStatus | "ALL" | null) => {
    if (!value) return
    setStatusFilter(value)
    setPage(1)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Financeiro" description="Histórico de pagamentos, confirmações e reembolsos." />

      <Select value={statusFilter} onValueChange={handleFilterChange}>
        <SelectTrigger className="w-56">
          <SelectValue>{(v: string | null) => STATUS_FILTER_LABEL[v ?? "ALL"]}</SelectValue>
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
        <EmptyState icon={Wallet} title="Nenhum pagamento encontrado" description="Pagamentos aparecem aqui conforme os pedidos são cobrados." />
      )}
    </div>
  )
}
