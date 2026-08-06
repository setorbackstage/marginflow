import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/server/lib/logger", () => ({ logger: { debug: vi.fn(), warn: vi.fn(), error: vi.fn() } }))
vi.mock("@/server/lib/audit", () => ({ logAudit: vi.fn().mockResolvedValue(undefined) }))

// Mocks dos módulos internos da camada de impressão (desacoplada).
const printJobRepository = {
  findById: vi.fn(),
  updateStatus: vi.fn(),
  updateContent: vi.fn(),
  incrementAttempts: vi.fn(),
  setRetry: vi.fn(),
  cancel: vi.fn(),
}
const provider = {
  getServerProvider: vi.fn(),
  isBrowserBridgeProvider: vi.fn(),
}
const config = {
  getStorePrintConfig: vi.fn(),
}

vi.mock("@/server/printing/print-job.repository", () => ({ printJobRepository }))
vi.mock("@/server/printing/provider", () => ({ getServerProvider: provider.getServerProvider, isBrowserBridgeProvider: provider.isBrowserBridgeProvider }))
vi.mock("@/server/printing/config", () => ({ getStorePrintConfig: config.getStorePrintConfig }))

import { nextRetryAt, isRetryExhausted, MAX_ATTEMPTS } from "@/server/printing/retry"
import { renderTemplate, mapTemplateTypeToDocumentType } from "@/server/printing/template"

describe("ETAPA 4 — Retry inteligente (backoff)", () => {
  it("aplica backoff progressivo sem loop infinito", () => {
    expect(nextRetryAt(1)).toBeInstanceOf(Date)
    expect(nextRetryAt(2)).toBeInstanceOf(Date)
    expect(nextRetryAt(3)).toBeInstanceOf(Date)
    expect(nextRetryAt(4)).toBeInstanceOf(Date)
  })

  it("esgota após MAX_ATTEMPTS e retorna null", () => {
    expect(isRetryExhausted(MAX_ATTEMPTS)).toBe(true)
    expect(isRetryExhausted(MAX_ATTEMPTS + 1)).toBe(true)
    expect(isRetryExhausted(1)).toBe(false)
    expect(nextRetryAt(MAX_ATTEMPTS)).toBeNull()
  })

  it("os intervalos crescem monotonicamente", () => {
    expect(nextRetryAt(2)!.getTime()).toBeGreaterThan(nextRetryAt(1)!.getTime())
    expect(nextRetryAt(3)!.getTime()).toBeGreaterThan(nextRetryAt(2)!.getTime())
  })
})

describe("ETAPA 5/12 — Templates (sem HTML não sanitizado)", () => {
  const ctx = {
    storeName: "<script>alert(1)</script>",
    orderNumber: 123,
    orderType: "DELIVERY",
    channel: "IFOOD",
    customerName: "<script>alert(1)</script>",
    items: [{ quantity: 2, name: "X-Burger", notes: "<b>sem cebola</b>" }],
    subtotal: 3000,
    total: 3500,
    notes: "msg <img src=x onerror=alert(1)>",
  }

  it("escapa HTML malicioso em todos os templates", () => {
    // Templates que efetivamente renderizam dados do cliente/loja
    for (const t of ["KITCHEN_TICKET", "CASHIER_RECEIPT", "DELIVERY_RECEIPT", "CANCELLATION", "TEST"] as const) {
      const html = renderTemplate(t, ctx)
      expect(html).not.toContain("<script>alert(1)</script>")
      expect(html).not.toContain("<img src=x onerror=alert(1)>")
      expect(html).not.toContain("<b>sem cebola</b>")
      expect(html).toContain("&lt;script&gt;")
    }
  })

  it("renderiza os 6 tipos de documento", () => {
    expect(renderTemplate("KITCHEN_TICKET", ctx)).toContain("COZINHA")
    expect(renderTemplate("CASHIER_RECEIPT", ctx)).toContain("RECIBO")
    expect(renderTemplate("DELIVERY_RECEIPT", ctx)).toContain("ENTREGA")
    expect(renderTemplate("REPRINT", ctx)).toContain("REIMPRESSAO")
    expect(renderTemplate("CANCELLATION", ctx)).toContain("CANCELAMENTO")
    expect(renderTemplate("TEST", ctx)).toContain("TESTE")
  })

  it("mapeia template.type → documentType", () => {
    expect(mapTemplateTypeToDocumentType("KITCHEN")).toBe("KITCHEN_TICKET")
    expect(mapTemplateTypeToDocumentType("RECEIPT")).toBe("CASHIER_RECEIPT")
    expect(mapTemplateTypeToDocumentType("DELIVERY")).toBe("DELIVERY_RECEIPT")
    expect(mapTemplateTypeToDocumentType("CANCELLATION")).toBe("CANCELLATION")
    expect(mapTemplateTypeToDocumentType(null)).toBeNull()
  })
})

describe("ETAPA 2/8 — Dispatcher com provider (desacoplado)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("provider server-side: marca PRINTED no sucesso", async () => {
    const { dispatchPrintJob } = await import("@/server/printing/dispatcher")
    printJobRepository.findById.mockResolvedValue({
      id: "job-1", storeId: "s1", status: "PENDING", attempts: 0,
      documentType: "TEST", content: "<p>ok</p>", destination: "p1", printerId: "p1", orderId: null,
    })
    provider.getServerProvider.mockReturnValue({
      id: "ESC_POS_TCP", print: vi.fn().mockResolvedValue({ ok: true }),
      connect: vi.fn(), disconnect: vi.fn(), listPrinters: vi.fn().mockResolvedValue([]), status: vi.fn(), test: vi.fn(),
    })
    provider.isBrowserBridgeProvider.mockReturnValue(false)
    config.getStorePrintConfig.mockResolvedValue({ provider: "ESC_POS_TCP", defaultWidthMm: 80 } as any)

    await dispatchPrintJob({} as never, "job-1")
    expect(printJobRepository.updateStatus).toHaveBeenCalledWith({}, "job-1", "PRINTED", null)
  })

  it("provider server-side: falha aplica retry (backoff)", async () => {
    const { dispatchPrintJob } = await import("@/server/printing/dispatcher")
    printJobRepository.findById.mockResolvedValue({
      id: "job-2", storeId: "s1", status: "RETRYING", attempts: 1,
      documentType: "TEST", content: "<p>ok</p>", destination: "p1", printerId: "p1", orderId: null,
    })
    provider.getServerProvider.mockReturnValue({
      id: "ESC_POS_TCP", print: vi.fn().mockResolvedValue({ ok: false, error: "offline" }),
      connect: vi.fn(), disconnect: vi.fn(), listPrinters: vi.fn().mockResolvedValue([]), status: vi.fn(), test: vi.fn(),
    })
    provider.isBrowserBridgeProvider.mockReturnValue(false)
    config.getStorePrintConfig.mockResolvedValue({ provider: "ESC_POS_TCP", defaultWidthMm: 80 } as any)

    await dispatchPrintJob({} as never, "job-2")
    expect(printJobRepository.setRetry).toHaveBeenCalled()
  })

  it("provider browser-based (QZ_TRAY): não chama print direto — delega ao bridge", async () => {
    const { dispatchPrintJob } = await import("@/server/printing/dispatcher")
    printJobRepository.findById.mockResolvedValue({
      id: "job-3", storeId: "s1", status: "PENDING", attempts: 0,
      documentType: "KITCHEN_TICKET", content: null, destination: "p1", printerId: "p1", orderId: "o1",
    })
    provider.getServerProvider.mockReturnValue({ id: "QZ_TRAY" })
    provider.isBrowserBridgeProvider.mockReturnValue(true)
    config.getStorePrintConfig.mockResolvedValue({ provider: "QZ_TRAY", defaultWidthMm: 80 } as any)

    await dispatchPrintJob({} as never, "job-3")
    // Para QZ_TRAY, marca PROCESSING e retorna (delega ao cliente). Não PRINTED.
    expect(printJobRepository.updateStatus).toHaveBeenCalledWith({}, "job-3", "PROCESSING", null)
  })
})
