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
