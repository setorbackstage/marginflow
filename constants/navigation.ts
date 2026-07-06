import {
  LayoutDashboard,
  ReceiptText,
  ChefHat,
  Package,
  BookOpenText,
  Boxes,
  Users,
  HeartHandshake,
  Truck,
  Wallet,
  ChartColumnBig,
  Blocks,
  Palette,
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
      { title: "Clientes", url: "/customers", icon: Users },
      { title: "CRM", url: "/crm", icon: HeartHandshake },
    ],
  },
  {
    label: "Análises",
    items: [
      { title: "Financeiro", url: "/finance", icon: Wallet },
      { title: "Relatórios", url: "/reports", icon: ChartColumnBig },
    ],
  },
  {
    label: "Sistema",
    items: [
      { title: "Integrações", url: "/integrations", icon: Blocks },
      { title: "Design System", url: "/design-system", icon: Palette },
      { title: "Configurações", url: "/settings", icon: Settings },
    ],
  },
]
