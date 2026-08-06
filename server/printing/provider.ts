/**
 * Fábrica e registry de providers (ETAPAS 2, 8, 14).
 *
 * A aplicação server-side NUNCA instancia QZ Tray diretamente. Para providers
 * baseados em browser (QZ_TRAY), o servidor usa um `BrowserBridgeProvider`: ele
 * apenas marca o job como PROCESSING e o disponibiliza; o cliente (browser) puxa
 * o job pendente e imprime usando o provider concreto nele (QZTrayBrowserProvider).
 * Providers server-side (ESC_POS_TCP, CLOUD_PRINT, PRINTER_AGENT) implementam a
 * mesma interface e imprimem direto — sem mudar o resto do sistema.
 */
import type { PrintProvider, PrintProviderId, StorePrintConfig } from "./types"
import { BrowserBridgeProvider } from "./providers/browser-bridge"
import { logger } from "../lib/logger"

/** Retorna o provider server-side para a configuração da loja. */
export function getServerProvider(config: StorePrintConfig): PrintProvider {
  switch (config.provider) {
    case "QZ_TRAY":
      return new BrowserBridgeProvider(config)
    // Futuros providers server-side entram aqui sem alterar o dispatcher:
    // case "ESC_POS_TCP": return new EscPosTcpProvider(config)
    // case "CLOUD_PRINT": return new CloudPrintProvider(config)
    // case "PRINTER_AGENT": return new PrinterAgentProvider(config)
    default:
      logger.warn("print.provider.unknown", { provider: config.provider })
      return new BrowserBridgeProvider(config)
  }
}

export function isBrowserBridgeProvider(id: PrintProviderId): boolean {
  return id === "QZ_TRAY"
}
