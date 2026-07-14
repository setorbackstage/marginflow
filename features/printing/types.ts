export interface Printer {
  id:        string
  storeId:   string
  name:      string
  type:      string
  model:     string | null
  interface: string
  address:   string | null
  isDefault: boolean
  isActive:  boolean
  createdAt: string
  updatedAt: string
}

export interface PrintTemplate {
  id:        string
  storeId:   string
  name:      string
  type:      string
  layout:    Record<string, unknown>
  isActive:  boolean
  createdAt: string
  updatedAt: string
}

export interface PrintRulePrinter {
  id:        string
  name:      string
  type:      string
  interface: string
}

export interface PrintRuleTemplate {
  id:   string
  name: string
  type: string
}

export interface PrintRule {
  id:         string
  storeId:    string
  printerId:  string
  templateId: string
  event:      string
  sector:     string | null
  isActive:   boolean
  sortOrder:  number
  createdAt:  string
  updatedAt:  string
  printer:    PrintRulePrinter
  template:   PrintRuleTemplate
}

export interface PrintJobPrinter {
  id:   string
  name: string
  type: string
}

export interface PrintJobTemplate {
  id:   string
  name: string
}

export interface PrintJob {
  id:         string
  storeId:    string
  printerId:  string
  templateId: string | null
  orderId:    string | null
  type:       string
  status:     string
  attempts:   number
  error:      string | null
  createdAt:  string
  printedAt:  string | null
  printer:    PrintJobPrinter
  template:   PrintJobTemplate | null
}

export interface PrintJobListParams {
  page?:      number
  limit?:     number
  printerId?: string
  status?:    string
  type?:      string
  from?:      string
  to?:        string
}

export const PRINTER_TYPE_LABEL: Record<string, string> = {
  KITCHEN:       "Cozinha",
  BAR:           "Bar",
  CONFECTIONERY: "Confeitaria",
  CASHIER:       "Caixa",
  FISCAL:        "Fiscal",
  DELIVERY:      "Delivery",
  EXPEDITION:    "Expedição",
  GENERAL:       "Geral",
}

export const PRINTER_INTERFACE_LABEL: Record<string, string> = {
  USB:       "USB",
  NETWORK:   "Rede (TCP/IP)",
  BLUETOOTH: "Bluetooth",
  SERIAL:    "Serial",
  VIRTUAL:   "Virtual",
}

export const PRINT_TEMPLATE_TYPE_LABEL: Record<string, string> = {
  ORDER:        "Pedido",
  RECEIPT:      "Comprovante",
  CANCELLATION: "Cancelamento",
  LABEL:        "Etiqueta",
  KITCHEN:      "Cozinha",
  DELIVERY:     "Entrega",
  TEST:         "Teste",
}

export const PRINT_JOB_STATUS_LABEL: Record<string, string> = {
  PENDING:   "Pendente",
  SENDING:   "Enviando",
  PRINTED:   "Impresso",
  ERROR:     "Erro",
  CANCELLED: "Cancelado",
}

export const PRINT_JOB_STATUS_COLOR: Record<string, string> = {
  PENDING:   "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  SENDING:   "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  PRINTED:   "bg-green-500/10 text-green-700 dark:text-green-400",
  ERROR:     "bg-destructive/10 text-destructive",
  CANCELLED: "bg-muted text-muted-foreground",
}

export const PRINT_EVENT_LABEL: Record<string, string> = {
  "order.created":          "Pedido criado",
  "order.confirmed":        "Pedido confirmado",
  "order.ready":            "Pedido pronto",
  "order.out_for_delivery": "Saiu para entrega",
  "order.delivered":        "Pedido entregue",
  "order.cancelled":        "Pedido cancelado",
  "payment.paid":           "Pagamento confirmado",
  "payment.refunded":       "Reembolso",
  "kitchen_ticket.created": "Ticket de cozinha criado",
  "kitchen_ticket.ready":   "Ticket de cozinha pronto",
  "delivery.created":       "Entrega criada",
  "delivery.dispatched":    "Entrega despachada",
  "delivery.delivered":     "Entrega concluída",
}
