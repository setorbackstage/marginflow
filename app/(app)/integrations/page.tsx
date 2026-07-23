"use client"

import { IntegrationsSection } from "@/features/integrations"
import { PageHeader } from "@/components/app-shell/page-container"

export default function IntegrationsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Integrações"
        description="Conecte sua loja a plataformas externas para receber pedidos automaticamente."
      />
      <IntegrationsSection />
    </div>
  )
}
