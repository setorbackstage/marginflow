"use client"

import * as React from "react"
import {
  LayoutDashboard,
  ReceiptText,
  ChefHat,
  Package,
  Users,
  Wallet,
  Settings,
  CheckCircle2,
  Circle,
  ArrowRight,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useOnboardingSettings, useDismissWelcome } from "@/features/onboarding"

const SECTIONS = [
  { icon: LayoutDashboard, name: "Dashboard", desc: "Visão geral em tempo real" },
  { icon: ReceiptText, name: "Pedidos", desc: "Gerencie todos os seus pedidos" },
  { icon: ChefHat, name: "Cozinha", desc: "Controle a produção e o tempo" },
  { icon: Package, name: "Estoque", desc: "Gerencie insumos e fichas técnicas" },
  { icon: Users, name: "Clientes", desc: "Base de clientes e histórico" },
  { icon: Wallet, name: "Financeiro", desc: "Receita, custos e fluxo de caixa" },
  { icon: Settings, name: "Configurações", desc: "Personalize sua operação" },
]

const CHECKLIST_PREVIEW = [
  "Criar loja",
  "Adicionar logo",
  "Cadastrar categorias",
  "Cadastrar produtos",
  "Cadastrar insumos",
  "Criar ficha técnica",
  "Cadastrar cliente",
  "Criar primeiro pedido",
  "Configurar pagamento",
  "Concluir onboarding",
]

export function WelcomeDialog() {
  const { settings, isLoading } = useOnboardingSettings()
  const dismissWelcome = useDismissWelcome()
  const [step, setStep] = React.useState(0)

  const open = !isLoading && !settings.welcomeDismissed

  function handleDismiss() {
    dismissWelcome()
  }

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss() }} disablePointerDismissal>
      <DialogContent className="max-w-lg">
        {step === 0 && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">Bem-vindo ao MarginFlow OS</DialogTitle>
              <DialogDescription>
                Seu sistema completo para gerenciar restaurantes e negócios de alimentação.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 gap-2 py-2">
              {SECTIONS.map(({ icon: Icon, name, desc }) => (
                <div key={name} className="flex items-center gap-3 rounded-md p-2 hover:bg-muted/50">
                  <Icon className="size-5 shrink-0 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{name}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">Como começar</DialogTitle>
              <DialogDescription>
                Preparamos um checklist para você configurar tudo em minutos.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5 py-2">
              {CHECKLIST_PREVIEW.map((label, i) => (
                <div key={label} className="flex items-center gap-2 text-sm">
                  <Circle className="size-4 shrink-0 text-muted-foreground" />
                  <span className={i === 0 ? "text-primary font-medium" : ""}>{label}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              O checklist ficará visível na barra lateral até você concluir todos os passos.
            </p>
          </>
        )}

        {step === 2 && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">Tudo pronto!</DialogTitle>
              <DialogDescription>
                Você está pronto para usar o MarginFlow OS. Explore cada seção no menu lateral.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-6">
              <CheckCircle2 className="size-16 text-primary" />
              <p className="text-center text-sm text-muted-foreground max-w-xs">
                O checklist de configuração estará disponível na barra lateral para guiar você pelos próximos passos.
              </p>
            </div>
          </>
        )}

        <div className="flex items-center justify-between pt-2">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`h-2 rounded-full transition-all ${i === step ? "w-6 bg-primary" : "w-2 bg-muted"}`}
                aria-label={`Passo ${i + 1}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {step < 2 && (
              <Button variant="ghost" size="sm" onClick={handleDismiss}>
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
                Próximo <ArrowRight className="ml-1 size-3" />
              </Button>
            ) : (
              <Button size="sm" onClick={handleDismiss}>
                Começar agora <ArrowRight className="ml-1 size-3" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
