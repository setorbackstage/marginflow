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
    items: [{ title: "Clientes", url: "/customers", icon: Users }],
  },
  {
    label: "Análises",
    items: [{ title: "Financeiro", url: "/finance", icon: Wallet }],
  },
  {
    label: "Sistema",
    items: [{ title: "Configurações", url: "/settings", icon: Settings }],
  },
]
