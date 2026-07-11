"use client"

import * as React from "react"
import { TourOverlay } from "./tour-overlay"
import type { TourStep } from "@/features/onboarding/types"

const DASHBOARD_STEPS: TourStep[] = [
  {
    selector: "[data-tour='dashboard-kpis']",
    title: "Indicadores em tempo real",
    content:
      "Acompanhe pedidos, receita, clientes, entregas e estoque — tudo atualizando automaticamente.",
  },
  {
    selector: "[data-tour='dashboard-recent-orders']",
    title: "Últimos pedidos",
    content: "Veja os pedidos mais recentes e acesse o detalhe de cada um com um clique.",
  },
  {
    selector: "[data-tour='dashboard-stock-alerts']",
    title: "Alertas de estoque",
    content: "Itens com estoque abaixo do mínimo aparecem aqui automaticamente.",
  },
  {
    selector: "[data-tour='sidebar-nav']",
    title: "Menu de navegação",
    content:
      "Acesse todas as áreas do sistema pela barra lateral: Pedidos, Cozinha, Estoque, Clientes, Financeiro e mais.",
  },
]

interface DashboardTourProps {
  active: boolean
  onComplete: () => void
  onSkip: () => void
}

export function DashboardTour({ active, onComplete, onSkip }: DashboardTourProps) {
  if (!active) return null
  return <TourOverlay steps={DASHBOARD_STEPS} onComplete={onComplete} onSkip={onSkip} />
}
