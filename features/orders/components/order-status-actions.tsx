"use client"

import * as React from "react"
import { Loader2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/shared"
import { useAuth } from "@/features/auth"
import { useUpdateOrderStatus } from "@/features/orders/hooks"
import { CLIENT_ORDER_TRANSITIONS, CANCELLABLE_STATUSES } from "@/features/orders/status"
import type { OrderDetail } from "@/features/orders/types"

const TRANSITION_PERMISSION: Record<string, string> = {
  PENDING: "orders:create",
  CONFIRMED: "orders:edit",
  DELIVERED: "orders:edit",
}

export function OrderStatusActions({ order }: { order: OrderDetail }) {
  const updateStatus = useUpdateOrderStatus(order.id)
  const { can } = useAuth()

  const [confirmTarget, setConfirmTarget] = React.useState<{ target: string; label: string } | null>(null)
  const [cancelOpen, setCancelOpen] = React.useState(false)
  const [cancelReason, setCancelReason] = React.useState("")

  // For TAKEAWAY, `READY -> DELIVERED` is the only client-callable transition
  // this endpoint owns; DELIVERY orders reach DELIVERED via the Delivery
  // module instead (API_SPEC.md's ownership note).
  const visibleTransitions = (CLIENT_ORDER_TRANSITIONS[order.status] ?? []).filter(
    (t) => (t.target !== "DELIVERED" || order.type === "TAKEAWAY") && can(TRANSITION_PERMISSION[t.target]),
  )

  const canCancelNow = can("orders:cancel") && CANCELLABLE_STATUSES.includes(order.status)

  if (visibleTransitions.length === 0 && !canCancelNow) return null

  return (
    <div className="flex flex-wrap gap-2">
      {visibleTransitions.map((t) => (
        <Button key={t.target} size="sm" onClick={() => setConfirmTarget(t)} disabled={updateStatus.isPending}>
          {updateStatus.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {t.label}
        </Button>
      ))}
      {canCancelNow ? (
        <Button size="sm" variant="outline" onClick={() => setCancelOpen(true)}>
          <X data-icon="inline-start" />
          Cancelar pedido
        </Button>
      ) : null}

      <ConfirmDialog
        open={!!confirmTarget}
        onOpenChange={(o) => !o && setConfirmTarget(null)}
        title={confirmTarget?.label ?? ""}
        description={`Tem certeza que deseja avançar o pedido #${order.number} para o próximo status?`}
        confirmLabel="Confirmar"
        isLoading={updateStatus.isPending}
        onConfirm={() => {
          if (!confirmTarget) return
          updateStatus.mutate({ status: confirmTarget.target }, { onSuccess: () => setConfirmTarget(null) })
        }}
      />

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar pedido #{order.number}</DialogTitle>
            <DialogDescription>Esta ação não pode ser desfeita. Informe o motivo do cancelamento.</DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="cancel-reason" className="mb-1.5">
              Motivo
            </Label>
            <Textarea id="cancel-reason" rows={3} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button
              variant="destructive"
              disabled={cancelReason.trim().length === 0 || updateStatus.isPending}
              onClick={() =>
                updateStatus.mutate(
                  { status: "CANCELLED", reason: cancelReason },
                  {
                    onSuccess: () => {
                      setCancelOpen(false)
                      setCancelReason("")
                    },
                  },
                )
              }
            >
              {updateStatus.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Confirmar cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
