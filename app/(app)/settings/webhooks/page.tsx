"use client"

import { WebhooksSection } from "@/features/webhooks"
import { PageHeader } from "@/components/app-shell/page-container"

export default function WebhooksPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Webhooks"
        description="Integre o MarginFlow a sistemas externos recebendo eventos (pedidos, pagamentos, entregas) em tempo real."
      />
      <WebhooksSection />
    </div>
  )
}
