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
  "product.created":          "Produto criado",
  "product.updated":          "Produto atualizado",
  "product.deleted":          "Produto excluído",
  "user.invited":             "Usuário convidado",
  "settings.updated":         "Configurações alteradas",
  "payment.refunded":         "Reembolso processado",
  "printer.created":          "Impressora cadastrada",
  "printer.updated":          "Impressora atualizada",
  "printer.deleted":          "Impressora excluída",
  "print_template.created":   "Template criado",
  "print_template.updated":   "Template atualizado",
  "print_template.deleted":   "Template excluído",
  "print_rule.created":       "Regra de impressão criada",
  "print_rule.deleted":       "Regra de impressão excluída",
  "print_job.created":        "Job de impressão criado",
  "order.created":            "Pedido criado",
  "order.confirmed":          "Pedido confirmado",
  "order.cancelled":          "Pedido cancelado",
  "order.delivered":          "Pedido entregue",
  "payment.paid":             "Pagamento recebido",
  "kitchen.ticket_created":   "Ticket de cozinha criado",
  "delivery.dispatched":      "Entrega despachada",
  "user.login":               "Login realizado",
  "user.logout":              "Logout realizado",
  "user.role_changed":        "Papel alterado",
}

// Entity type labels
export const AUDIT_ENTITY_LABEL: Record<string, string> = {
  Product:       "Produto",
  User:          "Usuário",
  Settings:      "Configurações",
  Payment:       "Pagamento",
  Order:         "Pedido",
  Printer:       "Impressora",
  PrintTemplate: "Template de impressão",
  PrintRule:     "Regra de impressão",
  PrintJob:      "Job de impressão",
  Customer:      "Cliente",
  Delivery:      "Entrega",
  Ingredient:    "Ingrediente",
  StockMovement: "Movimentação de estoque",
}
