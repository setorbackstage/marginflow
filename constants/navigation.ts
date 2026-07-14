import {
  LayoutDashboard,
  ReceiptText,
  ChefHat,
  Package,
  BookOpenText,
  Boxes,
  Users,
  Truck,
  Wallet,
  ClipboardList,
  BarChart2,
  Bell,
  Printer,
  Settings,
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
      { title: "Clientes",       url: "/customers",     icon: Users },
      { title: "Notificações",   url: "/notifications", icon: Bell  },
    ],
  },
  {
    label: "Análises",
    items: [
      { title: "Relatórios", url: "/reports", icon: BarChart2 },
      { title: "Financeiro", url: "/finance", icon: Wallet },
      { title: "Auditoria",  url: "/audit",   icon: ClipboardList },
    ],
  },
  {
    label: "Sistema",
    items: [
      { title: "Impressão", url: "/printing", icon: Printer },
      { title: "Configurações", url: "/settings", icon: Settings },
    ],
  },
]
