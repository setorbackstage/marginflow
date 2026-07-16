"use client"

import * as React from "react"

export type QZStatus = "disconnected" | "connecting" | "connected" | "error"

export interface QZTrayState {
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

// Módulo-level: garante que apenas UM <script> seja injetado em toda a sessão,
// mesmo que useQZTray seja chamado em múltiplos componentes simultaneamente.
let scriptPromise: Promise<void> | null = null

function loadQZScript(): Promise<void> {
  // Script já carregado com sucesso — reutiliza window.qz diretamente
  if (window.qz) return Promise.resolve()

  // Há uma carga em andamento — aguarda a mesma promise
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise<void>((resolve, reject) => {
    // Remove script tags falhos anteriores para garantir retry limpo
    document.querySelectorAll('script[data-qz]').forEach((el) => el.remove())

    const script = document.createElement("script")
    script.src = "https://cdn.qz.io/qz-tray/2.2.4/qz-tray.js"
    script.setAttribute("data-qz", "1")

    script.onload = () => resolve()

    script.onerror = () => {
      // Libera a promise para que o próximo connect() possa tentar de novo
      scriptPromise = null
      script.remove()
      reject(
        new Error(
          "Não foi possível carregar o MarginFlow Print Service. " +
          "Verifique sua conexão com a internet e se o QZ Tray está instalado.",
        ),
      )
    }

    document.head.appendChild(script)
  })

  return scriptPromise
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

      if (!window.qz) {
        throw new Error(
          "MarginFlow Print Service carregado, mas o QZ Tray não foi detectado. " +
          "Certifique-se de que o aplicativo QZ Tray está aberto no seu computador.",
        )
      }

      window.qz.websocket.setClosedCallbacks(() => setStatus("disconnected"))
      window.qz.websocket.setErrorCallbacks((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err)
        setError(
          msg.toLowerCase().includes("refused") || msg.toLowerCase().includes("websocket")
            ? "Conexão recusada. Abra o aplicativo QZ Tray no seu computador e tente novamente."
            : msg,
        )
        setStatus("error")
      })

      await window.qz.websocket.connect()
      setStatus("connected")
      setError(null)
    } catch (err) {
      setStatus("error")
      setError(
        err instanceof Error
          ? err.message
          : "Erro ao conectar ao MarginFlow Print Service.",
      )
    }
  }, [])

  const disconnect = React.useCallback(async () => {
    if (window.qz?.websocket.isActive()) {
      await window.qz.websocket.disconnect()
    }
    setStatus("disconnected")
    setError(null)
  }, [])

  const listPrinters = React.useCallback(async (): Promise<string[]> => {
    if (!window.qz) return []
    const result = await window.qz.printers.find()
    const list = Array.isArray(result) ? result : [result]
    setPrinters(list)
    return list
  }, [])

  const print = React.useCallback(async (printerName: string, data: string[]) => {
    if (!window.qz) throw new Error("MarginFlow Print Service não conectado.")
    const config = window.qz.configs.create(printerName)
    await window.qz.print(config, data.map((d) => ({ type: "raw", format: "plain", data: d })))
  }, [])

  const testPrint = React.useCallback(async (printerName: string) => {
    const testData = [
      "\x1B\x40",           // Init
      "\x1B\x61\x01",      // Center
      "MarginFlow Print Service\n",
      "================================\n",
      "\x1B\x61\x00",      // Left
      "Teste de impressao\n",
      new Date().toLocaleString("pt-BR") + "\n",
      "================================\n",
      "\x1D\x56\x00",      // Cut
    ]
    await print(printerName, testData)
  }, [print])

  return { status, printers, error, connect, disconnect, listPrinters, print, testPrint }
}
