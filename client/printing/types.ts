/**
 * Contrato de provider de impressão no cliente (ETAPA 8).
 *
 * Espelha a interface server-side. O QZ Tray (e futuros providers browser) são
 * as ÚNICAS implementações que conhecem a tecnologia concreta. A aplicação React
 * conhece apenas esta interface.
 */
export type ClientPrinter = {
  id: string
  name: string
}

export interface ClientPrintProvider {
  id: "QZ_TRAY"
  connect(): Promise<void>
  disconnect(): Promise<void>
  status(): Promise<"ONLINE" | "OFFLINE" | "CONNECTING" | "ERROR" | "RECONNECTING">
  listPrinters(): Promise<ClientPrinter[]>
  print(html: string, printerName: string): Promise<{ ok: boolean; error?: string }>
  test(printerName: string): Promise<{ ok: boolean; error?: string }>
}
