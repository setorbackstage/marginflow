/**
 * Dispatcher (ETAPAS 2, 8, 9).
 *
 * Ponto único que conhece os providers. Dado um PrintJob, decide como imprimir:
 *  - providers browser-based (QZ_TRAY): o servidor apenas marca PROCESSING e o
 *    cliente (browser) puxa o job pendente e imprime via provider concreto,
 *    acusando recebimento (ack). O dispatcher NÃO chama QZ Tray diretamente.
 *  - providers server-side (futuros): renderiza o template e chama provider.print().
 *
 * A impressão apenas REAGE a eventos; nunca é chamada manualmente da UI.
 */
import "server-only"
import type { DbClient } from "../db"
import type { PrintDocumentType } from "./types"
import { printJobRepository } from "./print-job.repository"
import { buildPrintContext, renderAndPersist } from "./dispatch-helpers"
import { getServerProvider, isBrowserBridgeProvider } from "./provider"
import { getStorePrintConfig } from "./config"
import { logger } from "../lib/logger"
import { logAudit } from "../lib/audit"

export async function dispatchPrintJob(db: DbClient, jobId: string): Promise<void> {
  const job = await printJobRepository.findById(db, jobId)
  if (!job) return
  if (!["PENDING", "RETRYING"].includes(job.status)) return

  await printJobRepository.updateStatus(db, jobId, "PROCESSING", null)

  const config = await getStorePrintConfig(db, job.storeId)
  const provider = getServerProvider(config)

  // Browser-based: delega ao cliente. O ack do cliente conclui (PRINTED).
  if (isBrowserBridgeProvider(config.provider)) {
    logger.debug("print.dispatch.bridge", { jobId, provider: config.provider })
    return
  }

  // Server-side provider: renderiza e imprime aqui.
  try {
    if (!job.content) {
      let ctx = null
      if (job.documentType === "TEST") {
        ctx = {
          orderNumber: "TESTE",
          customerName: "MarginFlow",
          items: [{ quantity: 1, name: "Impressão de teste" }],
          notes: "Se este cupom imprimiu, o provider está configurado corretamente.",
        }
      } else if (job.orderId) {
        ctx = await buildPrintContext(db, job.storeId, job.orderId, (job.documentType as PrintDocumentType) ?? "REPRINT")
      }
      if (!ctx) throw new Error("context_unavailable")
      const html = await renderAndPersist((job.documentType as PrintDocumentType) ?? "REPRINT", ctx)
      await printJobRepository.updateContent(db, jobId, html)
    }
    const result = await provider.print({
      printerId: job.destination ?? job.printerId,
      content: job.content ?? "",
      documentType: (job.documentType as PrintDocumentType) ?? "REPRINT",
      widthMm: config.defaultWidthMm,
    })
    if (result.ok) {
      await printJobRepository.updateStatus(db, jobId, "PRINTED", null)
      await logAudit(db, {
        storeId: job.storeId,
        userId: "system",
        action: "print.job.printed",
        entityType: "PrintJob",
        entityId: jobId,
        entityRef: job.documentType ?? job.type,
      })
    } else {
      await failJob(db, jobId, result.error ?? "unknown_error")
    }
  } catch (err) {
    await failJob(db, jobId, String(err))
  }
}

export async function failJob(db: DbClient, jobId: string, error: string): Promise<void> {
  const job = await printJobRepository.findById(db, jobId)
  if (!job) return
  const attempts = job.attempts + 1
  await printJobRepository.incrementAttempts(db, jobId)
  // retry importado dinamicamente para evitar ciclo
  const { nextRetryAt, isRetryExhausted } = await import("./retry")
  if (isRetryExhausted(attempts)) {
    await printJobRepository.updateStatus(db, jobId, "FAILED", error)
    await logAudit(db, {
      storeId: job.storeId,
      userId: "system",
      action: "print.job.failed",
      entityType: "PrintJob",
      entityId: jobId,
      entityRef: job.documentType ?? job.type,
    })
    // Notificação de falha (ETAPA 4)
    logger.warn("print.job.failed", { jobId, error })
  } else {
    await printJobRepository.setRetry(db, jobId, nextRetryAt(attempts), error)
  }
}

/** Ack do cliente (browser) confirmando impressão via bridge. */
export async function ackJob(db: DbClient, jobId: string): Promise<void> {
  await printJobRepository.updateStatus(db, jobId, "PRINTED", null)
}
