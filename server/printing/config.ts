/**
 * Configuração de impressão da loja (ETAPA 6).
 *
 * Tudo é salvo por loja em `store_settings.printConfig` (JSON). Lê com defaults
 * sensíveis e expõe um `StorePrintConfig` coerente para o dispatcher/templates.
 */
import "server-only"
import type { DbClient } from "../db"
import type { PrintDocumentType, PrintProviderId, StorePrintConfig } from "./types"

const DEFAULT_CONFIG: StorePrintConfig = {
  storeId: "",
  provider: "QZ_TRAY",
  autoPrint: true,
  silent: true,
  defaultWidthMm: 80,
  marginTopMm: 3,
  marginBottomMm: 3,
  fontFamily: "'Courier New', Courier, monospace",
  logoUrl: null,
  qrCodeEnabled: false,
  footerText: null,
  thankYouMessage: "Obrigado pela preferência!",
  enabledTypes: ["KITCHEN_TICKET", "CASHIER_RECEIPT", "DELIVERY_RECEIPT", "CANCELLATION"],
}

interface RawPrintConfig {
  provider?: PrintProviderId
  autoPrint?: boolean
  silent?: boolean
  defaultWidthMm?: number
  marginTopMm?: number
  marginBottomMm?: number
  fontFamily?: string
  logoUrl?: string | null
  qrCodeEnabled?: boolean
  footerText?: string | null
  thankYouMessage?: string | null
  enabledTypes?: PrintDocumentType[]
}

export async function getStorePrintConfig(db: DbClient, storeId: string): Promise<StorePrintConfig> {
  const settings = await db.storeSettings.findUnique({ where: { storeId } })
  const raw = (settings?.printConfig ?? {}) as RawPrintConfig
  return {
    ...DEFAULT_CONFIG,
    storeId,
    provider: raw.provider ?? DEFAULT_CONFIG.provider,
    autoPrint: raw.autoPrint ?? DEFAULT_CONFIG.autoPrint,
    silent: raw.silent ?? DEFAULT_CONFIG.silent,
    defaultWidthMm: raw.defaultWidthMm ?? DEFAULT_CONFIG.defaultWidthMm,
    marginTopMm: raw.marginTopMm ?? DEFAULT_CONFIG.marginTopMm,
    marginBottomMm: raw.marginBottomMm ?? DEFAULT_CONFIG.marginBottomMm,
    fontFamily: raw.fontFamily ?? DEFAULT_CONFIG.fontFamily,
    logoUrl: raw.logoUrl ?? null,
    qrCodeEnabled: raw.qrCodeEnabled ?? DEFAULT_CONFIG.qrCodeEnabled,
    footerText: raw.footerText ?? null,
    thankYouMessage: raw.thankYouMessage ?? DEFAULT_CONFIG.thankYouMessage,
    enabledTypes: raw.enabledTypes ?? DEFAULT_CONFIG.enabledTypes,
  }
}

export async function saveStorePrintConfig(
  db: DbClient,
  storeId: string,
  input: Partial<RawPrintConfig>,
): Promise<StorePrintConfig> {
  await db.storeSettings.upsert({
    where: { storeId },
    create: { storeId, printConfig: input as object },
    update: { printConfig: input as object },
  })
  return getStorePrintConfig(db, storeId)
}
