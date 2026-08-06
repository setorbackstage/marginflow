"use client"

import * as React from "react"
import { Printer as PrinterIcon, Check, ChevronRight, ChevronLeft, Wand2, Wifi, WifiOff, Loader2 } from "lucide-react"
import { toast } from "sonner"

import {
  useQZTray,
  useCreatePrinter,
  usePrinters,
  usePrintTemplates,
  useCreatePrintRule,
  useSavePrintConfig,
  PRINTER_TYPE_LABEL,
} from "@/features/printing"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

type Step = "provider" | "connect" | "printers" | "rules" | "test" | "done"

const PROVIDERS = [
  { id: "QZ_TRAY", name: "QZ Tray", desc: "Impressão via navegador (Windows/Mac/Linux). Recomendado.", enabled: true },
  { id: "PRINTER_AGENT", name: "MarginFlow Printer Agent", desc: "Agente dedicado (em breve).", enabled: false },
  { id: "ESC_POS_TCP", name: "Impressão IP (ESC/POS)", desc: "Impressora térmica via rede (em breve).", enabled: false },
  { id: "CLOUD_PRINT", name: "Cloud Print", desc: "Nuvem (futuro).", enabled: false },
] as const

export function PrintingSetupWizard({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [step, setStep] = React.useState<Step>("provider")
  const [provider, setProvider] = React.useState<string>("QZ_TRAY")
  const [selectedPrinters, setSelectedPrinters] = React.useState<string[]>([])
  const [defaultPrinter, setDefaultPrinter] = React.useState<string>("")
  const [rules, setRules] = React.useState({ kitchen: true, payment: true, cancellation: false })
  const [saving, setSaving] = React.useState(false)

  const qz = useQZTray()
  const createPrinter = useCreatePrinter()
  const printers = usePrinters()
  const templates = usePrintTemplates()
  const createRule = useCreatePrintRule()
  const saveConfig = useSavePrintConfig()

  const detected = qz.printers ?? []

  const togglePrinter = (name: string) => {
    setSelectedPrinters((prev) => {
      const next = prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]
      if (!defaultPrinter && next.length) setDefaultPrinter(next[0])
      if (defaultPrinter === name) setDefaultPrinter(next[0] ?? "")
      return next
    })
  }

  const handleSavePrinters = async () => {
    setSaving(true)
    try {
      for (const name of selectedPrinters) {
        await createPrinter.mutateAsync({
          name,
          type: "THERMAL",
          interface: "NETWORK",
          isDefault: name === defaultPrinter,
          isActive: true,
        } as never)
      }
      toast.success(`${selectedPrinters.length} impressora(s) salva(s).`)
      setStep("rules")
    } catch {
      toast.error("Erro ao salvar impressoras.")
    } finally {
      setSaving(false)
    }
  }

  const handleSaveRules = async () => {
    setSaving(true)
    try {
      const tpl = templates.data ?? []
      const kitchenTpl = tpl.find((t) => t.type === "KITCHEN")
      const receiptTpl = tpl.find((t) => t.type === "RECEIPT")
      const cancelTpl = tpl.find((t) => t.type === "CANCELLATION")
      // Mapeia nome → id das impressoras já salvas
      const saved = (printers.data ?? []) as { id: string; name: string }[]
      const byName = (name: string) => saved.find((p: { id: string; name: string }) => p.name === name)?.id
      if (rules.kitchen && kitchenTpl) {
        for (const name of selectedPrinters) {
          const pid = byName(name)
          if (pid) await createRule.mutateAsync({ printerId: pid, templateId: kitchenTpl.id, event: "order.confirmed", sector: "COZINHA", isActive: true } as never)
        }
      }
      if (rules.payment && receiptTpl) {
        for (const name of selectedPrinters) {
          const pid = byName(name)
          if (pid) await createRule.mutateAsync({ printerId: pid, templateId: receiptTpl.id, event: "payment.paid", sector: "CAIXA", isActive: true } as never)
        }
      }
      if (rules.cancellation && cancelTpl) {
        for (const name of selectedPrinters) {
          const pid = byName(name)
          if (pid) await createRule.mutateAsync({ printerId: pid, templateId: cancelTpl.id, event: "order.cancelled", sector: "COZINHA", isActive: true } as never)
        }
      }
      toast.success("Regras de automação criadas.")
      setStep("test")
    } catch {
      toast.error("Erro ao criar regras de impressão.")
    } finally {
      setSaving(false)
    }
  }

  const handleFinish = async () => {
    setSaving(true)
    try {
      await saveConfig.mutateAsync({
        provider,
        autoPrint: true,
        defaultPrinterName: defaultPrinter,
        enabledTypes: ["KITCHEN_TICKET", "CASHIER_RECEIPT", "DELIVERY_RECEIPT", "CANCELLATION", "TEST", "REPRINT"],
      })
      toast.success("Impressão automática configurada!")
      setStep("done")
    } catch {
      toast.error("Erro ao salvar configuração.")
    } finally {
      setSaving(false)
    }
  }

  const steps: Step[] = ["provider", "connect", "printers", "rules", "test", "done"]
  const idx = steps.indexOf(step)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="size-4" /> Assistente de configuração de impressão
          </DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {steps.map((s, i) => (
            <React.Fragment key={s}>
              <span className={i === idx ? "font-semibold text-foreground" : ""}>{i + 1}</span>
              {i < steps.length - 1 && <span className="mx-1">→</span>}
            </React.Fragment>
          ))}
        </div>

        <div className="min-h-[220px] py-2">
          {step === "provider" && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Escolha o provedor de impressão.</p>
              {PROVIDERS.map((p) => (
                <Card
                  key={p.id}
                  className={`cursor-pointer p-3 ${provider === p.id ? "ring-2 ring-primary" : ""} ${p.enabled ? "" : "opacity-50"}`}
                  onClick={() => p.enabled && setProvider(p.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.desc}</p>
                    </div>
                    {provider === p.id && <Check className="size-4 text-primary" />}
                    {!p.enabled && <span className="text-xs text-muted-foreground">Em breve</span>}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {step === "connect" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                O QZ Tray precisa estar instalado e aberto no computador. Baixe em{" "}
                <a href="https://qz.io/download/" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  qz.io/download
                </a>
                .
              </p>
              <div className="flex items-center gap-2 rounded-lg border p-3">
                {qz.status === "connected" ? (
                  <Wifi className="size-4 text-green-500" />
                ) : qz.status === "connecting" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <WifiOff className="size-4" />
                )}
                <span className="flex-1 text-sm">
                  {qz.status === "connected" ? "Conectado ao MarginFlow Print Service" : "Desconectado"}
                </span>
                {qz.status !== "connected" && (
                  <Button size="sm" onClick={() => qz.connect()} disabled={qz.status === "connecting"}>
                    Conectar
                  </Button>
                )}
              </div>
              {qz.status === "connected" && (
                <p className="text-xs text-green-600">Conectado! Clique em avançar para detectar impressoras.</p>
              )}
            </div>
          )}

          {step === "printers" && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Impressoras detectadas pelo QZ Tray. Selecione as que deseja usar e marque a padrão.
              </p>
              {detected.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma impressora detectada. Conecte o QZ Tray e clique em “Atualizar”.</p>
              ) : (
                detected.map((name) => (
                  <Card key={name} className="flex items-center gap-3 p-3">
                    <Checkbox checked={selectedPrinters.includes(name)} onCheckedChange={() => togglePrinter(name)} />
                    <PrinterIcon className="size-4 text-muted-foreground" />
                    <Label className="flex-1 text-sm">{name}</Label>
                    <Button size="sm" variant={defaultPrinter === name ? "default" : "outline"} onClick={() => setDefaultPrinter(name)}>
                      Padrão
                    </Button>
                  </Card>
                ))
              )}
              <Button size="sm" variant="ghost" onClick={() => qz.listPrinters()}>
                Atualizar
              </Button>
            </div>
          )}

          {step === "rules" && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Escolha o que imprimir automaticamente:</p>
              {[
                { key: "kitchen", label: "Ticket de cozinha (ao confirmar pedido)" },
                { key: "payment", label: "Comprovante (ao receber pagamento)" },
                { key: "cancellation", label: "Aviso de cancelamento" },
              ].map((r) => (
                <Card key={r.key} className="flex items-center gap-3 p-3">
                  <Checkbox
                    checked={rules[r.key as keyof typeof rules]}
                    onCheckedChange={(v) => setRules((prev) => ({ ...prev, [r.key]: Boolean(v) }))}
                  />
                  <Label className="flex-1 text-sm">{r.label}</Label>
                </Card>
              ))}
            </div>
          )}

          {step === "test" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Envie um teste para a impressora padrão para confirmar que está tudo funcionando.</p>
              <Button onClick={() => qz.testPrint(defaultPrinter)} disabled={!defaultPrinter || qz.status !== "connected"}>
                <PrinterIcon className="size-4" /> Imprimir teste
              </Button>
            </div>
          )}

          {step === "done" && (
            <div className="space-y-2 text-center">
              <Check className="mx-auto size-10 text-green-500" />
              <p className="text-sm font-medium">Impressão automática configurada!</p>
              <p className="text-xs text-muted-foreground">
                Agora os pedidos, pagamentos e cancelamentos disparam impressão automaticamente conforme as regras criadas.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => (idx > 0 ? setStep(steps[idx - 1]) : onOpenChange(false))}
            disabled={saving}
          >
            <ChevronLeft className="size-4" /> Voltar
          </Button>

          {step === "provider" && (
            <Button onClick={() => setStep("connect")}>
              Avançar <ChevronRight className="size-4" />
            </Button>
          )}
          {step === "connect" && (
            <Button onClick={() => setStep("printers")} disabled={qz.status !== "connected"}>
              Avançar <ChevronRight className="size-4" />
            </Button>
          )}
          {step === "printers" && (
            <Button onClick={handleSavePrinters} disabled={selectedPrinters.length === 0 || saving}>
              Salvar impressoras <ChevronRight className="size-4" />
            </Button>
          )}
          {step === "rules" && (
            <Button onClick={handleSaveRules} disabled={saving}>
              Criar regras <ChevronRight className="size-4" />
            </Button>
          )}
          {step === "test" && (
            <Button onClick={handleFinish} disabled={saving}>
              Concluir <Check className="size-4" />
            </Button>
          )}
          {step === "done" && (
            <Button onClick={() => onOpenChange(false)}>Fechar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
