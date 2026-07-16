"use client"

import * as React from "react"
import { Loader2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
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
import { isApiError } from "@/lib/api"
import { useUpdateOrderStatus } from "@/features/orders/hooks"
import { CLIENT_ORDER_TRANSITIONS, CANCELLABLE_STATUSES } from "@/features/orders/status"
import type { OrderDetail } from "@/features/orders/types"

const MANAGER_APPROVAL_CODES = ["KITCHEN_STARTED_CANCEL_REQUIRES_MANAGER", "DISPATCHED_DELIVERY_CANCEL_REQUIRES_MANAGER"]

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
  const [needsManagerApproval, setNeedsManagerApproval] = React.useState(false)
  const [managerEmail, setManagerEmail] = React.useState("")
  const [managerApprovalPassword, setManagerApprovalPassword] = React.useState("")

  // READY→DELIVERED is available for TAKEAWAY ("Marcar como retirado") and
  // DINE_IN ("Fechar mesa"). DELIVERY orders reach DELIVERED via Delivery module.
  const visibleTransitions = (CLIENT_ORDER_TRANSITIONS[order.status] ?? []).filter((t) => {
    if (!can(TRANSITION_PERMISSION[t.target])) return false
    if (t.types) return t.types.includes(order.type)
    return true
  })

  const canCancelNow = can("orders:cancel") && CANCELLABLE_STATUSES.includes(order.status)

  if (visibleTransitions.length === 0 && !canCancelNow) return null

  const resetCancelState = () => {
    setCancelOpen(false)
    setCancelReason("")
    setNeedsManagerApproval(false)
    setManagerEmail("")
    setManagerApprovalPassword("")
  }

  const submitCancel = () => {
    updateStatus.mutate(
      {
        status: "CANCELLED",
        reason: cancelReason,
        ...(needsManagerApproval ? { managerEmail, managerApprovalPassword } : {}),
      },
      {
        onSuccess: resetCancelState,
        onError: (error) => {
          if (isApiError(error) && MANAGER_APPROVAL_CODES.includes(error.code)) {
            setNeedsManagerApproval(true)
          }
        },
      },
    )
  }

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

      <Dialog open={cancelOpen} onOpenChange={(o) => (o ? setCancelOpen(true) : resetCancelState())}>
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
          {needsManagerApproval ? (
            <div className="space-y-3 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
              <p className="text-sm text-muted-foreground">
                Este pedido já está em preparo. Peça a um gerente ou proprietário presente para aprovar o
                cancelamento com o e-mail e a senha de aprovação dele (configurada em Configurações → Segurança).
              </p>
              <div>
                <Label htmlFor="manager-email" className="mb-1.5">
                  E-mail do gerente
                </Label>
                <Input id="manager-email" type="email" value={managerEmail} onChange={(e) => setManagerEmail(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="manager-approval-password" className="mb-1.5">
                  Senha de aprovação do gerente
                </Label>
                <Input
                  id="manager-approval-password"
                  type="password"
                  value={managerApprovalPassword}
                  onChange={(e) => setManagerApprovalPassword(e.target.value)}
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button
              variant="destructive"
              disabled={
                updateStatus.isPending ||
                (needsManagerApproval && (managerEmail.trim().length === 0 || managerApprovalPassword.length === 0))
              }
              onClick={submitCancel}
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
