import "server-only"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/server/db"
import { paymentService, authorizationService } from "@/server/services"
import { requireAuth, parseJsonBody } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok } from "@/server/lib/http"

interface RouteContext {
  params: Promise<{ storeId: string; paymentId: string }>
}

/** API_SPEC.md `POST /api/v1/stores/:storeId/payments/:paymentId/refund` — request body. */
const refundPaymentSchema = z.object({
  amount: z.number().int().positive(),
  reason: z.string().min(10),
})

async function handleRefundPayment(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, paymentId } = await params
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "orders:refund")

  const input = await parseJsonBody(request, refundPaymentSchema)
  const payment = await paymentService.refund(prisma, storeId, paymentId, input, actor.userId)

  // API_SPEC.md documents a smaller response shape for this endpoint than
  // GET /payments/:paymentId — no order/attempts, just the refund outcome.
  return ok({
    id: payment.id,
    amount: payment.amount,
    refundedAmount: payment.refundedAmount,
    status: payment.status,
    refundReason: payment.refundReason,
    refundedAt: payment.refundedAt,
  })
}

export const POST = compose(withRequestContext, withErrorHandling)(handleRefundPayment)
