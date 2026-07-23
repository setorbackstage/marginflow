// ─── Overview ─────────────────────────────────────────────────────────────

export interface RevenueDay {
  date:    string
  revenue: number
  orders:  number
}

export interface ChannelBreakdown {
  channel: string
  orders:  number
  revenue: number
}

export interface PaymentMethodBreakdown {
  method: string
  count:  number
  total:  number
}

export interface TopProduct {
  productId: string
  name:      string
  quantity:  number
  revenue:   number
}

export interface ReportsSummary {
  totalRevenue:  number
  totalOrders:   number
  averageTicket: number
  newCustomers:  number
}

export interface ReportsOverview {
  summary:          ReportsSummary
  revenueByDay:     RevenueDay[]
  byChannel:        ChannelBreakdown[]
  byPaymentMethod:  PaymentMethodBreakdown[]
  topProducts:      TopProduct[]
}

export interface ReportsParams {
  dateFrom: string
  dateTo:   string
}

// ─── Sales ────────────────────────────────────────────────────────────────

export interface SalesSeriesPoint {
  date:             string
  revenue:          number
  orderCount:       number
  averageOrderValue: number
}

export interface SalesTotals {
  revenue:    number
  orderCount: number
}

export interface ReportsSales {
  groupBy: "day" | "hour"
  series:  SalesSeriesPoint[]
  totals:  SalesTotals
}

export interface ReportsSalesParams extends ReportsParams {
  groupBy?: "day" | "hour"
}

// ─── Orders ───────────────────────────────────────────────────────────────

export interface OrderTypeBreakdown {
  count:   number
  revenue: number
}

export interface OrderChannelBreakdown {
  count:   number
  revenue: number
}

export interface ReportsOrders {
  byType:                     Record<string, OrderTypeBreakdown>
  byChannel:                  Record<string, OrderChannelBreakdown>
  cancellationRate:           number
  averagePreparationMinutes:  number | null
  averageDeliveryMinutes:     number | null
}

// ─── Products ─────────────────────────────────────────────────────────────

export interface ProductReportItem {
  productId:        string
  productName:      string
  categoryName:     string | null
  quantitySold:     number
  revenue:          number
  refundedQuantity: number
  revenueShare:     number
}

// ─── Customers ────────────────────────────────────────────────────────────

export interface TopCustomer {
  customerId:  string
  name:        string
  orderCount:  number
  totalSpent:  number
}

export interface ReportsCustomers {
  totalActive:        number
  newInPeriod:        number
  returningInPeriod:  number
  repeatPurchaseRate: number
  topCustomers:       TopCustomer[]
}

// ─── Delivery ─────────────────────────────────────────────────────────────

export interface DeliveryPlatformBreakdown {
  count:       number
  successRate: number
}

export interface ReportsDelivery {
  totalDeliveries:        number
  delivered:              number
  failed:                 number
  returned:               number
  successRate:            number
  averageDispatchMinutes: number | null
  averageDeliveryMinutes: number | null
  byPlatform:             Record<string, DeliveryPlatformBreakdown>
}
