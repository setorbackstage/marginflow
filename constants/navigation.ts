import {
  LayoutDashboard,
  ReceiptText,
  ChefHat,
  Package,
  BookOpenText,
  Users,
  HeartHandshake,
  Truck,
  Wallet,
  ChartColumnBig,
  Blocks,
  Palette,
  Settings,
} from "lucide-react"

import type { NavGroup, Restaurant } from "@/types/navigation"

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

export const restaurants: Restaurant[] = [
  { id: "minha-loja", name: "Minha Loja", type: "Loja principal", initials: "ML" },
  { id: "loja-centro", name: "Loja Centro", type: "Restaurante", initials: "LC" },
  { id: "loja-shopping", name: "Loja Shopping", type: "Praça de alimentação", initials: "LS" },
  { id: "cozinha-delivery", name: "Cozinha Delivery", type: "Dark kitchen", initials: "CD" },
]
