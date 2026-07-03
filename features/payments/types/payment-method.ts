/** The payment instrument used by the customer. */
export enum PaymentMethod {
  Cash = "CASH",
  CreditCard = "CREDIT_CARD",
  DebitCard = "DEBIT_CARD",
  Pix = "PIX",
  Voucher = "VOUCHER",
  GiftCard = "GIFT_CARD",
  Online = "ONLINE",        // generic online payment via gateway
}

/**
 * The payment processor or gateway used to handle the transaction.
 * MANUAL = no external gateway (e.g., cash, in-person card via reader).
 */
export enum PaymentGateway {
  Manual = "MANUAL",
  Stripe = "STRIPE",
  PagarMe = "PAGARME",
  MercadoPago = "MERCADO_PAGO",
  Iugu = "IUGU",
  Asaas = "ASAAS",
}
