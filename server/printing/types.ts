/**
 * Tipos e contratos da camada de impressão.
 *
 * Princípio da sprint: a aplicação NUNCA conhece um provider concreto (QZ Tray,
 * Printer Agent, ESC/POS…). Conhece apenas a interface `PrintProvider` e os
 * tipos abaixo. Toda a lógica de impressão é desacoplada e reage a eventos.
 */

/** Status possíveis de um PrintJob (fila). Nada é perdido: todo job termina
 *  em PRINTED, FAILED ou CANCELLED. */
export type PrintJobStatus =
  | "PENDING"
  | "PROCESSING"
  | "PRINTED"
  | "FAILED"
  | "CANCELLED"
  | "RETRYING"

/** Tipos de documento impresso. Cada um mapeia para um template. */
export type PrintDocumentType =
  | "KITCHEN_TICKET"
  | "CASHIER_RECEIPT"
  | "DELIVERY_RECEIPT"
  | "REPRINT"
  | "TEST"
  | "CANCELLATION"

/** Identificador do provider. Novos providers apenas adicionam um valor. */
export type PrintProviderId =
  | "QZ_TRAY" // primeiro provider suportado (browser bridge)
  | "PRINTER_AGENT" // futuro: MarginFlow Printer Agent
  | "ESC_POS_TCP" // futuro: impressão IP direta
  | "CLOUD_PRINT" // futuro

/** Eventos de domínio que disparam impressão (reação, nunca chamada manual). */
export type PrintTriggerEvent =
  | "order.confirmed"
  | "order.ready"
  | "order.cancelled"
  | "payment.received"
  | "kitchen_ticket.created"

/** Resultado de uma tentativa de impressão. */
export interface PrintResult {
  ok: boolean
  error?: string
  /** Identificador do job no provider (quando aplicável). */
  providerJobId?: string
}

/**
 * Contrato comum a TODOS os providers (server-side ou browser-side).
 * Um provider sabe: conectar, desconectar, listar impressoras, imprimir,
 * testar e reportar status. A aplicação só fala com esta interface.
 */
export interface PrintProvider {
  readonly id: PrintProviderId
  connect(): Promise<void>
  disconnect(): Promise<void>
  listPrinters(): Promise<PrintPrinterInfo[]>
  /** Imprime um documento já renderizado (HTML ou comandos nativos). */
  print(input: PrintRequest): Promise<PrintResult>
  /** Imprime uma página de teste na impressora informada. */
  test(printerId: string): Promise<PrintResult>
  status(): Promise<PrintProviderStatus>
}

export interface PrintPrinterInfo {
  id: string
  name: string
  /** Interface física: BROWSER | NETWORK | USB | CLOUD */
  interface: string
  isDefault?: boolean
  isOnline?: boolean
}

export interface PrintRequest {
  printerId: string
  /** Conteúdo já renderizado (HTML para providers baseados em browser). */
  content: string
  documentType: PrintDocumentType
  /** Largura do papel em mm (ex: 80). Usado por providers térmicos. */
  widthMm?: number
  copies?: number
}

export type PrintProviderStatus = "ONLINE" | "OFFLINE" | "ERROR" | "RECONNECTING"

/** Metadados de uma impressora conforme configurada na loja. */
export interface StorePrinterConfig {
  id: string
  name: string
  type: string
  interface: string
  address?: string | null
  isDefault: boolean
  isActive: boolean
}

/** Linha de item usada nos templates (dados já resolvidos). */
export interface PrintLineItem {
  quantity: number
  name: string
  notes?: string | null
  modifiers?: string[]
}

/** Dados resolvidos de um pedido para renderização de template.
 *  Campos obrigatórios mínimos: orderNumber e items. O restante é opcional,
 *  pois nem todo documento (ex: teste) carrega todos os dados. */
export interface PrintContext {
  storeName?: string
  orderNumber: number | string
  orderType?: string
  channel?: string
  customerName?: string | null
  customerPhone?: string | null
  address?: string | null
  tableNumber?: string | null
  items: PrintLineItem[]
  subtotal?: number
  discount?: number
  deliveryFee?: number
  total?: number
  notes?: string | null
  createdAt?: string | null
  logoUrl?: string | null
  qrCodeEnabled?: boolean
  footerText?: string | null
  thankYouMessage?: string | null
  widthMm?: number
}

/** Configuração completa de impressão da loja (ETAPA 6). */
export interface StorePrintConfig {
  storeId: string
  provider: PrintProviderId
  /** Impressão automática reage a eventos sem intervenção. */
  autoPrint: boolean
  /** Impressão silenciosa (sem diálogo do SO). */
  silent: boolean
  /** Largura padrão do papel (mm). */
  defaultWidthMm: number
  /** Margens (mm) e fonte usadas pelos templates. */
  marginTopMm: number
  marginBottomMm: number
  fontFamily: string
  /** Caminho/URL do logo (quando houver). */
  logoUrl?: string | null
  /** Habilita QR Code no rodapé (ex: link de avaliação). */
  qrCodeEnabled: boolean
  /** Texto de rodapé e mensagem de agradecimento. */
  footerText?: string | null
  thankYouMessage?: string | null
  /** Tipos de documento habilitados para auto-impressão. */
  enabledTypes: PrintDocumentType[]
}
