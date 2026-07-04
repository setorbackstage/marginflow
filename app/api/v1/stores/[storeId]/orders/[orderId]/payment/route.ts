import "server-only"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/server/db"
import { paymentService, authorizationService } from "@/server/services"
import { requireAuth, parseJsonBody } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, created } from "@/server/lib/http"

interface RouteContext {
  params: Promise<{ storeId: string; orderId: string }>
}

/** API_SPEC.md `POST /api/v1/stores/:storeId/orders/:orderId/payment` — request body. */
const initiatePaymentSchema = z.object({
  method: z.enum(["CASH", "CREDIT_CARD", "DEBIT_CARD", "PIX", "VOUCHER", "GIFT_CARD", "ONLINE"]),
  gateway: z.enum(["MANUAL", "STRIPE", "PAGARME", "MERCADO_PAGO", "IUGU", "ASAAS"]).optional(),
  amount: z.number().int().positive().optional(),
})

async function handleInitiatePayment(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, orderId } = await params
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "orders:edit")

  const input = await parseJsonBody(request, initiatePaymentSchema)
  const { payment, attemptId } = await paymentService.initiate(prisma, storeId, orderId, input)

  return created({
    id: payment.id,
    orderId: payment.orderId,
    amount: payment.amount,
    status: payment.status,
    method: payment.method,
    gateway: payment.gateway,
    attemptId,
    createdAt: payment.createdAt,
  })
}

export const POST = compose(withRequestContext, withErrorHandling)(handleInitiatePayment)
