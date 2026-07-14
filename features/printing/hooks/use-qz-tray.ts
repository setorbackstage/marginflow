"use client"

import * as React from "react"

export type QZStatus = "disconnected" | "connecting" | "connected" | "error"

interface QZTrayState {
  status:       QZStatus
  printers:     string[]
  error:        string | null
  connect:      () => Promise<void>
  disconnect:   () => Promise<void>
  listPrinters: () => Promise<string[]>
  print:        (printerName: string, data: string[]) => Promise<void>
  testPrint:    (printerName: string) => Promise<void>
}

declare global {
  interface Window {
    qz?: {
      websocket: {
        connect:            (config?: object) => Promise<void>
        disconnect:         () => Promise<void>
        isActive:           () => boolean
        setClosedCallbacks: (cb: () => void) => void
        setErrorCallbacks:  (cb: (err: unknown) => void) => void
      }
      printers: {
        find:       (name?: string) => Promise<string | string[]>
        getDefault: () => Promise<string>
      }
      configs: {
        create: (printer: string, options?: object) => object
      }
      print: (config: object, data: object[]) => Promise<void>
    }
  }
}

let scriptLoaded = false

async function loadQZScript(): Promise<void> {
  if (scriptLoaded || window.qz) {
    scriptLoaded = true
    return
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script")
    script.src = "https://cdn.qz.io/qz-tray/2.2.4/qz-tray.js"
    script.onload = () => { scriptLoaded = true; resolve() }
    script.onerror = () => reject(new Error("Falha ao carregar MarginFlow Print Service"))
    document.head.appendChild(script)
  })
}

export function useQZTray(): QZTrayState {
  const [status, setStatus]     = React.useState<QZStatus>("disconnected")
  const [printers, setPrinters] = React.useState<string[]>([])
  const [error, setError]       = React.useState<string | null>(null)

  const connect = React.useCallback(async () => {
    setStatus("connecting")
    setError(null)
    try {
      await loadQZScript()
      if (!window.qz) throw new Error("MarginFlow Print Service não disponível")
      window.qz.websocket.setClosedCallbacks(() => setStatus("disconnected"))
      window.qz.websocket.setErrorCallbacks((err: unknown) => {
        setError(String(err))
        setStatus("error")
      })
      await window.qz.websocket.connect()
      setStatus("connected")
    } catch (err) {
      setStatus("error")
      setError(err instanceof Error ? err.message : "Erro ao conectar ao MarginFlow Print Service")
    }
  }, [])

  const disconnect = React.useCallback(async () => {
    if (window.qz?.websocket.isActive()) {
      await window.qz.websocket.disconnect()
    }
    setStatus("disconnected")
  }, [])

  const listPrinters = React.useCallback(async (): Promise<string[]> => {
    if (!window.qz) return []
    const result = await window.qz.printers.find()
    const list = Array.isArray(result) ? result : [result]
    setPrinters(list)
    return list
  }, [])

  const print = React.useCallback(async (printerName: string, data: string[]) => {
    if (!window.qz) throw new Error("MarginFlow Print Service não conectado")
    const config = window.qz.configs.create(printerName)
    await window.qz.print(config, data.map((d) => ({ type: "raw", format: "plain", data: d })))
  }, [])

  const testPrint = React.useCallback(async (printerName: string) => {
    const testData = [
      "\x1B\x40",        // Init
      "\x1B\x61\x01",   // Center
      "MarginFlow Print Service\n",
      "================================\n",
      "\x1B\x61\x00",   // Left
      "Teste de impressao\n",
      new Date().toLocaleString("pt-BR") + "\n",
      "================================\n",
      "\x1D\x56\x00",   // Cut
    ]
    await print(printerName, testData)
  }, [print])

  return { status, printers, error, connect, disconnect, listPrinters, print, testPrint }
}
