"use client"
/**
 * Provider QZ Tray (ETAPA 8) — ÚNICO lugar que conhece QZ Tray.
 *
 * Implementa `ClientPrintProvider`. A aplicação React NUNCA importa isto
 * diretamente nas telas de pedido; ela usa o bridge (`client/printing/bridge.ts`)
 * que, por sua vez, usa este provider. QZ Tray roda no browser via WebSocket
 * para a aplicação QZ Tray local (desktop) ou túnel.
 */
import type { ClientPrintProvider, ClientPrinter } from "../types"

function getQz(): any {
  if (typeof window === "undefined") return undefined
  return (window as any).qz ?? (window as any).qzWebView
}

export class QZTrayProvider implements ClientPrintProvider {
  id = "QZ_TRAY" as const
  private connected = false

  async connect(): Promise<void> {
    const qz = getQz()
    if (!qz) throw new Error("QZ_TRAY_NOT_LOADED")
    if (!qz.websocket.isActive()) {
      await qz.websocket.connect()
    }
    this.connected = true
  }

  async disconnect(): Promise<void> {
    const qz = getQz()
    if (qz && qz.websocket.isActive()) {
      await qz.websocket.disconnect()
    }
    this.connected = false
  }

  async status() {
    const qz = getQz()
    if (!qz) return "OFFLINE"
    if (qz.websocket.isActive()) return "ONLINE"
    return "OFFLINE"
  }

  async listPrinters(): Promise<ClientPrinter[]> {
    const qz = getQz()
    if (!qz || !qz.websocket.isActive()) return []
    const names: string[] = await qz.printers.find()
    return names.map((n) => ({ id: n, name: n }))
  }

  async print(html: string, printerName: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const qz = getQz()
      if (!qz) return { ok: false, error: "QZ_TRAY_NOT_LOADED" }
      if (!qz.websocket.isActive()) await this.connect()
      const config = qz.configs.create(null)
      const data = [{ type: "html", format: "plain", data: html }]
      await qz.print(qz.configs.create(printerName, config), data)
      return { ok: true }
    } catch (e) {
      return { ok: false, error: String(e) }
    }
  }

  async test(printerName: string): Promise<{ ok: boolean; error?: string }> {
    const html = "<h2>MarginFlow — Teste de Impressão</h2><p>QZ Tray OK</p>"
    return this.print(html, printerName)
  }
}
