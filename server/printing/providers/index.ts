/**
 * Registry de providers suportados (ETAPA 14 — arquitetura pronta p/ futuro).
 *
 * Para adicionar um novo provider (MarginFlow Printer Agent, ESC/POS TCP,
 * Bluetooth, Android, Cloud Print), basta:
 *   1. adicionar o valor em `PrintProviderId` (types.ts)
 *   2. implementar a interface `PrintProvider`
 *   3. registrar aqui e no factory `getServerProvider` (provider.ts)
 * O dispatcher, os eventos, os templates e a UI NÃO mudam.
 */
import type { PrintProviderId } from "../types"

export interface ProviderDescriptor {
  id: PrintProviderId
  label: string
  /** true = roda no browser (precisa de bridge); false = roda no servidor. */
  browserBased: boolean
  available: boolean
}

export const SUPPORTED_PROVIDERS: ProviderDescriptor[] = [
  { id: "QZ_TRAY", label: "QZ Tray", browserBased: true, available: true },
  // Futuros — disponibilizados sem alterar o restante do sistema:
  { id: "PRINTER_AGENT", label: "MarginFlow Printer Agent", browserBased: false, available: false },
  { id: "ESC_POS_TCP", label: "Impressão IP (ESC/POS)", browserBased: false, available: false },
  { id: "CLOUD_PRINT", label: "Cloud Print", browserBased: false, available: false },
]

export function getProviderDescriptor(id: PrintProviderId): ProviderDescriptor | undefined {
  return SUPPORTED_PROVIDERS.find((p) => p.id === id)
}
