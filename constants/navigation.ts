import {
  LayoutDashboard,
  ReceiptText,
  ChefHat,
  Truck,
  Package,
  BookOpenText,
  Boxes,
  UsersRound,
  BellRing,
  BarChart3,
  Wallet,
  ScrollText,
  Plug,
  Webhook,
  Printer,
  Settings2,
} from "lucide-react"

import type { NavGroup } from "@/types/navigation"

export const navGroups: NavGroup[] = [
  {
    label: "Operações",
    items: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard },
      { title: "Pedidos", url: "/orders", icon: ReceiptText },
      { title: "Cozinha", url: "/kitchen", icon: ChefHat },
      { title: "Entregas", url: "/delivery", icon: Truck },
    ],
  },
  {
    label: "Catálogo",
    items: [
      { title: "Produtos", url: "/products", icon: Package },
      { title: "Cardápio", url: "/menu", icon: BookOpenText },
      { title: "Estoque", url: "/inventory", icon: Boxes },
    ],
  },
  {
    label: "Relacionamento",
    items: [
      { title: "Clientes", url: "/customers", icon: UsersRound },
      { title: "Notificações", url: "/notifications", icon: BellRing },
    ],
  },
  {
    label: "Análises",
    items: [
      { title: "Relatórios", url: "/reports", icon: BarChart3 },
      { title: "Financeiro", url: "/finance", icon: Wallet },
      { title: "Auditoria", url: "/audit", icon: ScrollText },
    ],
  },
  {
    label: "Integrações",
    items: [
      { title: "Marketplaces", url: "/integrations", icon: Plug },
      { title: "Webhooks", url: "/settings/webhooks", icon: Webhook },
      { title: "Impressão", url: "/printing", icon: Printer },
    ],
  },
  {
    label: "Conta",
    items: [
      { title: "Configurações", url: "/settings", icon: Settings2 },
    ],
  },
]
