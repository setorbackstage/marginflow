"use client"

import Link from "next/link"
import { ReceiptText, Truck, ChefHat, ArrowRight, Store } from "lucide-react"

import { useAuth } from "@/features/auth"
import { useDashboardCounts } from "@/features/dashboard/hooks"
import { PageHeader } from "@/components/app-shell/page-container"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"

interface Kpi {
  label: string
  value: number | undefined
  icon: typeof ReceiptText
  href: string
}

export default function DashboardPage() {
  const { session, activeMembership } = useAuth()
  const counts = useDashboardCounts()

  const firstName = session.user.name?.split(" ")[0] ?? "operador"

  const kpis: Kpi[] = [
    { label: "Pedidos", value: counts.data?.orders, icon: ReceiptText, href: "/orders" },
    { label: "Entregas", value: counts.data?.deliveries, icon: Truck, href: "/delivery" },
    { label: "Cozinha", value: counts.data?.kitchen, icon: ChefHat, href: "/kitchen" },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Olá, ${firstName}`}
        description="Visão geral das operações da sua loja em tempo real."
      />

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Store className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium">{activeMembership.storeName}</p>
              <p className="text-xs text-muted-foreground">
                Você está conectado como {session.user.email}
              </p>
            </div>
          </div>
          <Badge variant="secondary">{activeMembership.role.displayName}</Badge>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((kpi) => (
          <Link key={kpi.label} href={kpi.href} className="group">
            <Card className="transition-colors group-hover:border-primary/40">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.label}</CardTitle>
                <kpi.icon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {counts.isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : counts.isError ? (
                  <span className="text-sm text-destructive">Erro ao carregar</span>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-semibold tabular-nums">{kpi.value ?? 0}</span>
                    <ArrowRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
