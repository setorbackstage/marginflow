/**
 * BrowserBridgeProvider (server-side stub para providers baseados em browser).
 *
 * QZ Tray (e futuros providers browser) executam NO cliente. O servidor não pode
 * chamá-los diretamente. Este provider é a representação server-side do bridge:
 *  - `connect/status/listPrinters` reportam o estado do bridge (preenchido pelo cliente).
 *  - `print` NÃO é invocado pelo dispatcher para este provider; o dispatcher marca
 *    o job como PROCESSING e o cliente o consome via `/api/print/pending`, imprime e
 *    acusa recebimento (`ack`), levando o job a PRINTED.
 *
 * Assim a aplicação continua falando apenas com a interface `PrintProvider`.
 */
import type { PrintProvider, PrintProviderStatus, PrintPrinterInfo, PrintRequest, PrintResult, StorePrintConfig } from "../types"
import { logger } from "../../lib/logger"

export class BrowserBridgeProvider implements PrintProvider {
  readonly id = "QZ_TRAY" as const
  constructor(private readonly config: StorePrintConfig) {}

  async connect(): Promise<void> {
    logger.debug("print.bridge.connect", { storeId: this.config.storeId })
  }

  async disconnect(): Promise<void> {
    logger.debug("print.bridge.disconnect", { storeId: this.config.storeId })
  }

  /** A lista real de impressoras vive no cliente (QZ Tray). O servidor não a tem. */
  async listPrinters(): Promise<PrintPrinterInfo[]> {
    return []
  }

  /**
   * No servidor, para providers browser-based, o dispatcher NÃO chama este método.
   * Ele apenas sinaliza que o job foi entregue ao bridge. O ack do cliente é quem
   * confirma a impressão. Retornamos ok:true para manter a interface coerente.
   */
  async print(_input: PrintRequest): Promise<PrintResult> {
    return { ok: true, providerJobId: "bridge" }
  }

  async test(_printerId: string): Promise<PrintResult> {
    return { ok: true, providerJobId: "bridge-test" }
  }

  async status(): Promise<PrintProviderStatus> {
    return "ONLINE"
  }
}
