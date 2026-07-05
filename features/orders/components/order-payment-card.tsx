"use client"

import * as React from "react"
import { Loader2, Wallet } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { EmptyState, StatusBadge } from "@/components/shared"
import { useCan } from "@/features/auth"
import { formatCents, formatDateTime } from "@/lib/format"
import { useInitiatePayment } from "@/features/orders/hooks"
import { usePayment, useConfirmPayment, useRefundPayment } from "@/features/payments/hooks"
import { PAYMENT_STATUS_CONFIG, PAYMENT_METHOD_LABEL } from "@/features/payments/status"
import type { OrderDetail } from "@/features/orders/types"

const UNPAYABLE_STATUSES = ["DRAFT", "PENDING", "CANCELLED"]

export function OrderPaymentCard({ order }: { order: OrderDetail }) {
  const canEdit = useCan("orders:edit")
  const canRefund = useCan("orders:refund")
  const payment = usePayment(order.paymentId ?? undefined)
  const initiatePayment = useInitiatePayment(order.id)
  const confirmPayment = useConfirmPayment()
  const [method, setMethod] = React.useState("PIX")
  const [refundOpen, setRefundOpen] = React.useState(false)
  const [refundAmount, setRefundAmount] = React.useState("")
  const [refundReason, setRefundReason] = React.useState("")
  const refundPayment = useRefundPayment(order.paymentId ?? "")

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Wallet className="size-4" />
          Pagamento
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!order.paymentId ? (
          UNPAYABLE_STATUSES.includes(order.status) ? (
            <p className="text-sm text-muted-foreground">
              O pedido precisa estar confirmado antes de iniciar o pagamento.
            </p>
          ) : canEdit ? (
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label className="mb-1.5">Forma de pagamento</Label>
                <Select value={method} onValueChange={(v) => v && setMethod(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue>{(v: string | null) => (v ? PAYMENT_METHOD_LABEL[v] : "")}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PAYMENT_METHOD_LABEL).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => initiatePayment.mutate({ method })} disabled={initiatePayment.isPending}>
                {initiatePayment.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                Iniciar pagamento
              </Button>
            </div>
          ) : (
            <EmptyState icon={Wallet} title="Nenhum pagamento iniciado" />
          )
        ) : payment.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : payment.data ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold tabular-nums">{formatCents(payment.data.amount)}</p>
                <p className="text-xs text-muted-foreground">
                  {PAYMENT_METHOD_LABEL[payment.data.method]} · {payment.data.gateway}
                </p>
              </div>
              <StatusBadge status={payment.data.status} config={PAYMENT_STATUS_CONFIG} />
            </div>

            {payment.data.refundedAmount > 0 ? (
              <p className="text-xs text-muted-foreground">Reembolsado: {formatCents(payment.data.refundedAmount)}</p>
            )  : null}

            {payment.data.status === "PENDING" && canEdit ? (
              <Button size="sm" onClick={() => confirmPayment.mutate(payment.data!.id)} disabled={confirmPayment.isPending}>
                {confirmPayment.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                Confirmar recebimento
              </Button>
            ) : null}

            {(payment.data.status === "PAID" || payment.data.status === "PARTIALLY_REFUNDED") && canRefund ? (
              <Button size="sm" variant="outline" onClick={() => setRefundOpen(true)}>
                Reembolsar
              </Button>
            ) : null}

            {payment.data.paidAt ? <p className="text-xs text-muted-foreground">Pago em {formatDateTime(payment.data.paidAt)}</p> : null}
          </div>
        ) : null}
      </CardContent>

      <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reembolsar pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="refund-amount" className="mb-1.5">
                Valor a reembolsar (R$)
              </Label>
              <Input id="refund-amount" type="number" step="0.01" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="refund-reason" className="mb-1.5">
                Motivo (mínimo 10 caracteres)
              </Label>
              <Textarea id="refund-reason" rows={3} value={refundReason} onChange={(e) => setRefundReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="destructive"
              disabled={!refundAmount || refundReason.trim().length < 10 || refundPayment.isPending}
              onClick={() =>
                refundPayment.mutate(
                  { amount: Math.round(Number(refundAmount) * 100), reason: refundReason },
                  {
                    onSuccess: () => {
                      setRefundOpen(false)
                      setRefundAmount("")
                      setRefundReason("")
                    },
                  },
                )
              }
            >
              {refundPayment.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Confirmar reembolso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
