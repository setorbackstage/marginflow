"use client"
/**
 * Bridge de impressão no browser (ETAPA 8/9).
 *
 * Ciclo: puxa jobs PENDING do servidor → imprime via provider (QZ Tray) →
 * acusa recebimento (ack) ou falha (fail → server aplica retry). A tela NUNCA
 * chama QZ Tray diretamente; ela só inicia este bridge.
 */
import type { ClientPrintProvider } from "./types"

export type PendingJob = {
  id: string
  documentType: string | null
  content: string | null
  printerId: string
  status: string
}

export async function runPrintBridge(
  storeId: string,
  provider: ClientPrintProvider,
  opts: { onStatus?: (msg: string) => void } = {},
): Promise<{ printed: number; failed: number }> {
  const { onStatus } = opts
  onStatus?.("Conectando ao provider…")
  await provider.connect().catch(() => {})
  if ((await provider.status()) !== "ONLINE") {
    onStatus?.("Provider offline")
    return { printed: 0, failed: 0 }
  }

  const res = await fetch(`/api/v1/stores/${storeId}/printing/pending`)
  if (!res.ok) {
    onStatus?.("Falha ao obter fila")
    return { printed: 0, failed: 0 }
  }
  const { jobs } = (await res.json()) as { jobs: PendingJob[] }
  let printed = 0
  let failed = 0

  for (const job of jobs) {
    if (!job.content) {
      failed++
      continue
    }
    onStatus?.(`Imprimindo job ${job.id}…`)
    const result = await provider.print(job.content, job.printerId !== "default" ? job.printerId : "")
    if (result.ok) {
      await fetch(`/api/v1/stores/${storeId}/printing/jobs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ack" }),
      })
      printed++
    } else {
      await fetch(`/api/v1/stores/${storeId}/printing/jobs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "fail", error: result.error }),
      })
      failed++
    }
  }

  onStatus?.(`Concluído: ${printed} impressos, ${failed} falhas`)
  return { printed, failed }
}
