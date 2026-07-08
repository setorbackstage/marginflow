import type { StatusConfig } from "@/components/shared"

export const MEMBERSHIP_STATUS_CONFIG: Record<string, StatusConfig> = {
  ACTIVE: { label: "Ativo", tone: "success" },
  INVITED: { label: "Convite pendente", tone: "warning" },
  SUSPENDED: { label: "Suspenso", tone: "neutral" },
  REVOKED: { label: "Revogado", tone: "danger" },
}

/**
 * Friendly profile description shown next to the role name in the invite
 * picker — purely presentational, not a business rule. Matches the exact
 * permission set each built-in role already carries (server/lib/permissions.ts).
 */
export const ROLE_PROFILE_DESCRIPTION: Record<string, string> = {
  OWNER: "Acesso total à loja, incluindo faturamento.",
  MANAGER: "Acesso total à operação, exceto faturamento.",
  CASHIER: "Cria e acompanha pedidos e clientes.",
  KITCHEN_ATTENDANT: "Acompanha e atualiza a produção na cozinha.",
  DELIVERY_COORDINATOR: "Acompanha e atualiza as entregas.",
  ANALYST: "Acesso de leitura a relatórios, financeiro e catálogo.",
}
