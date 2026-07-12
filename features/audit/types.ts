export interface AuditLogUser {
  id:    string
  name:  string
  email: string
}

export interface AuditLogEntry {
  id:         string
  action:     string
  entityType: string
  entityId:   string | null
  entityRef:  string | null
  meta:       Record<string, unknown> | null
  createdAt:  string
  user:       AuditLogUser | null
}

export interface AuditLogListParams {
  page?:       number
  limit?:      number
  action?:     string
  entityType?: string
  from?:       string
  to?:         string
}

// Human-readable labels for audit actions
export const AUDIT_ACTION_LABEL: Record<string, string> = {
  "product.created":  "Produto criado",
  "product.updated":  "Produto atualizado",
  "product.deleted":  "Produto excluído",
  "user.invited":     "Usuário convidado",
  "settings.updated": "Configurações alteradas",
  "payment.refunded": "Reembolso processado",
}

// Entity type labels
export const AUDIT_ENTITY_LABEL: Record<string, string> = {
  Product:  "Produto",
  User:     "Usuário",
  Settings: "Configurações",
  Payment:  "Pagamento",
  Order:    "Pedido",
}
