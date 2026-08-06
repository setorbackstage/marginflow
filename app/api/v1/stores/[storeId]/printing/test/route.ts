import "server-only"
import type { NextRequest } from "next/server"
import { prisma } from "@/server/db"
import { authorizationService } from "@/server/services"
import { requireAuth, requireUuidParams } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok, withRateLimit } from "@/server/lib/http"
import { enqueueTestPrint } from "@/server/printing/jobs"
import { getStorePrintConfig } from "@/server/printing/config"
import { dispatchPrintJob } from "@/server/printing/dispatcher"

interface RouteContext {
  params: Promise<{ storeId: string }>
}

/**
 * Dispara uma impressão de teste na impressora informada (ou padrão da loja).
 */
async function handleTest(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "printing:manage")
  const body = await request.json().catch(() => ({}))
  const cfg = await getStorePrintConfig(prisma, storeId)
  const printerId = body.printerId ?? "default"
  const jobId = await enqueueTestPrint(prisma, storeId, printerId)
  // Para providers server-side, processa imediatamente; para browser, o bridge consome.
  await dispatchPrintJob(prisma, jobId).catch(() => {})
  return ok({ id: jobId, status: "PENDING" })
}

export const POST = compose(withRequestContext, withRateLimit(), withErrorHandling)(handleTest)
