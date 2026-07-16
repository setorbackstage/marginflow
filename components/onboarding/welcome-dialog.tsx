"use client"

import * as React from "react"
import {
  ReceiptText,
  ChefHat,
  Package,
  Users,
  Wallet,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  MapPin,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useOnboardingSettings, useDismissWelcome, useSetTourPending } from "@/features/onboarding"

const FEATURES = [
  {
    icon: ReceiptText,
    name: "Pedidos",
    desc: "Gerencie pedidos de todos os canais em tempo real",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: ChefHat,
    name: "Cozinha",
    desc: "Painel KDS para produção e controle de tempo",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
  {
    icon: Package,
    name: "Estoque",
    desc: "Insumos, fichas técnicas e alertas automáticos",
    color: "text-green-500",
    bg: "bg-green-500/10",
  },
  {
    icon: Users,
    name: "Clientes & CRM",
    desc: "Base de clientes com histórico e segmentos",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
  {
    icon: Wallet,
    name: "Financeiro",
    desc: "Receita, pagamentos e fluxo de caixa",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
]

const CHECKLIST_PREVIEW = [
  { label: "Adicionar logo", done: true },
  { label: "Cadastrar categorias", done: false },
  { label: "Cadastrar produtos", done: false },
  { label: "Configurar pagamento", done: false },
  { label: "Criar primeiro pedido", done: false },
]

export function WelcomeDialog() {
  const { settings, isLoading } = useOnboardingSettings()
  const dismissWelcome = useDismissWelcome()
  const setTourPending = useSetTourPending()
  const [step, setStep] = React.useState(0)

  const open = !isLoading && !settings.welcomeDismissed

  function handleDismiss() {
    dismissWelcome()
  }

  function handleStart() {
    // Sinaliza que o tour deve ser exibido ao chegar no dashboard
    setTourPending(true)
    dismissWelcome()
  }

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss() }} disablePointerDismissal>
      <DialogContent className="max-w-md overflow-hidden p-0">
        {/* ── Step 0: Boas-vindas ── */}
        {step === 0 && (
          <>
            {/* Header com gradiente */}
            <div className="flex flex-col items-center gap-3 bg-gradient-to-b from-primary/15 to-transparent px-6 pt-8 pb-6">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/25">
                <Sparkles className="size-7 text-primary-foreground" />
              </div>
              <div className="text-center">
                <h2 className="text-xl font-bold tracking-tight">Bem-vindo ao MarginFlow OS</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tudo que seu restaurante precisa em um só lugar.
                </p>
              </div>
            </div>

            {/* Feature grid */}
            <div className="grid grid-cols-1 gap-1.5 px-6 pb-2">
              {FEATURES.map(({ icon: Icon, name, desc, color, bg }) => (
                <div key={name} className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-muted/50 transition-colors">
                  <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${bg}`}>
                    <Icon className={`size-4 ${color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight">{name}</p>
                    <p className="truncate text-xs text-muted-foreground">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── Step 1: Checklist preview ── */}
        {step === 1 && (
          <>
            <div className="flex flex-col items-center gap-3 bg-gradient-to-b from-primary/15 to-transparent px-6 pt-8 pb-6">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/25">
                <CheckCircle2 className="size-7 text-primary-foreground" />
              </div>
              <div className="text-center">
                <h2 className="text-xl font-bold tracking-tight">Configure em minutos</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Um checklist guiado aparecerá na barra lateral até você concluir tudo.
                </p>
              </div>
            </div>

            <div className="space-y-1 px-6 pb-4">
              {CHECKLIST_PREVIEW.map(({ label, done }) => (
                <div key={label} className="flex items-center gap-2.5 rounded-lg px-2 py-2">
                  <CheckCircle2
                    className={`size-4 shrink-0 ${done ? "text-primary" : "text-muted-foreground/40"}`}
                  />
                  <span className={`text-sm ${done ? "text-muted-foreground line-through" : ""}`}>
                    {label}
                  </span>
                </div>
              ))}
              <p className="px-2 pt-1 text-xs text-muted-foreground">
                + mais 5 passos para uma configuração completa
              </p>
            </div>
          </>
        )}

        {/* ── Step 2: Tudo pronto ── */}
        {step === 2 && (
          <>
            <div className="flex flex-col items-center gap-3 bg-gradient-to-b from-emerald-500/15 to-transparent px-6 pt-8 pb-6">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-500 shadow-lg shadow-emerald-500/25">
                <MapPin className="size-7 text-white" />
              </div>
              <div className="text-center">
                <h2 className="text-xl font-bold tracking-tight">Tudo pronto!</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Vamos fazer um tour rápido pelo dashboard para você conhecer os principais painéis.
                </p>
              </div>
            </div>

            <div className="space-y-2 px-6 pb-4">
              {[
                "Indicadores e KPIs em tempo real",
                "Últimos pedidos e movimentações",
                "Alertas de estoque automáticos",
                "Menu de navegação completo",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <div className="size-1.5 shrink-0 rounded-full bg-primary" />
                  {item}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── Footer com navegação ── */}
        <div className="flex items-center justify-between border-t px-6 py-4">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"
                }`}
                aria-label={`Passo ${i + 1}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {step < 2 && (
              <Button variant="ghost" size="sm" onClick={handleDismiss} className="text-muted-foreground">
                Pular
              </Button>
            )}
            {step > 0 && step < 2 && (
              <Button variant="outline" size="sm" onClick={() => setStep(step - 1)}>
                Anterior
              </Button>
            )}
            {step < 2 ? (
              <Button size="sm" onClick={() => setStep(step + 1)}>
                Próximo <ArrowRight className="ml-1 size-3.5" />
              </Button>
            ) : (
              <Button size="sm" onClick={handleStart}>
                Iniciar tour <ArrowRight className="ml-1 size-3.5" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
