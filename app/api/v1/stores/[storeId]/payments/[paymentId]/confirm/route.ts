import "server-only"
import type { NextRequest } from "next/server"
import { prisma } from "@/server/db"
import { paymentService, orderService, authorizationService } from "@/server/services"
import { requireAuth } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok } from "@/server/lib/http"
import { toPaymentDetailResponse } from "../../_payment-response"

interface RouteContext {
  params: Promise<{ storeId: string; paymentId: string }>
}

async function handleConfirmPayment(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId, paymentId } = await params
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "orders:edit")

  const payment = await paymentService.confirm(prisma, storeId, paymentId)
  const [order, attempts] = await Promise.all([
    orderService.getById(prisma, payment.orderId),
    paymentService.listAttemptsByOrder(prisma, payment.orderId),
  ])

  return ok(toPaymentDetailResponse(payment, order.number, attempts))
}

export const POST = compose(withRequestContext, withErrorHandling)(handleConfirmPayment)
