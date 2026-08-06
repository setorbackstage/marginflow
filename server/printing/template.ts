/**
 * Sistema de templates (ETAPA 5).
 *
 * Toda a geração de HTML fica AQUI — nada de HTML espalhado pela aplicação.
 * Cada template é independente e recebe um `PrintContext` (dados já resolvidos
 * pelo dispatcher). Todo dado dinâmico é escapado (ETAPA 12 — sem XSS).
 */
import type { PrintDocumentType, PrintContext } from "./types"

export type { PrintDocumentType } from "./types"

/** Mapeia o `type` de um PrintTemplate para o documentType do job. */
export function mapTemplateTypeToDocumentType(t?: string | null): PrintDocumentType | null {
  switch ((t ?? "").toUpperCase()) {
    case "KITCHEN":
    case "KITCHEN_TICKET":
      return "KITCHEN_TICKET"
    case "RECEIPT":
    case "CASHIER_RECEIPT":
      return "CASHIER_RECEIPT"
    case "DELIVERY":
    case "DELIVERY_RECEIPT":
      return "DELIVERY_RECEIPT"
    case "CANCELLATION":
      return "CANCELLATION"
    case "REPRINT":
      return "REPRINT"
    case "TEST":
      return "TEST"
    default:
      return null
  }
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function fmtCents(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)
}

function fmtDateTime(iso?: string | null): string {
  if (!iso) return "—"
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(iso))
}

function pageStyle(widthMm: number): string {
  return `@page { size: ${widthMm}mm auto; margin: 3mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Courier New', Courier, monospace; font-size: 9pt; line-height: 1.4; color: #000; background: #fff; width: ${widthMm}mm; }
  pre { white-space: pre-wrap; word-break: break-all; }`
}

function itemsBlock(ctx: PrintContext): string {
  return ctx.items
    .map((it) => {
      const qty = `${it.quantity}x`
      const name = escapeHtml(it.name)
      const mods = (it.modifiers ?? []).map((m) => `  + ${escapeHtml(m)}`).join("\n")
      const note = it.notes ? `  Obs: ${escapeHtml(it.notes)}` : ""
      return [name.length ? `${qty} ${name}` : qty, mods, note].filter(Boolean).join("\n")
    })
    .join("\n\n")
}

function totalsBlock(ctx: PrintContext): string {
  const subtotal = Number(ctx.subtotal ?? 0)
  const discount = Number(ctx.discount ?? 0)
  const deliveryFee = Number(ctx.deliveryFee ?? 0)
  const total = Number(ctx.total ?? ctx.subtotal ?? 0)
  const rows = [row("Subtotal", fmtCents(subtotal))]
  if (discount > 0) rows.push(row("Desconto", `-${fmtCents(discount)}`))
  if (deliveryFee > 0) rows.push(row("Taxa de entrega", fmtCents(deliveryFee)))
  rows.push(row("TOTAL", fmtCents(total)))
  return rows.join("\n")
}

function row(left: string, right: string, width = 32): string {
  const gap = width - left.length - right.length
  return gap <= 0 ? `${left} ${right}` : left + " ".repeat(gap) + right
}

function sep(width = 32): string {
  return "-".repeat(width)
}

function footer(ctx: PrintContext): string {
  const parts: string[] = []
  if (ctx.qrCodeEnabled) parts.push("[QR] avalie-nos")
  if (ctx.footerText) parts.push(escapeHtml(ctx.footerText))
  if (ctx.thankYouMessage) parts.push(escapeHtml(ctx.thankYouMessage))
  return parts.join("\n")
}

function doc(title: string, ctx: PrintContext, body: string, widthMm = 80): string {
  const w = ctx.widthMm ?? widthMm
  const head = ctx.logoUrl
    ? `<div style="text-align:center"><img src="${escapeHtml(ctx.logoUrl)}" style="max-height:40px"/></div>`
    : ""
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><style>${pageStyle(w)}</style></head>
<body><pre>${head}${head ? "\n" : ""}${body}</pre></body></html>`
}

export function renderTemplate(type: PrintDocumentType, ctx: PrintContext): string {
  switch (type) {
    case "KITCHEN_TICKET": {
      const body = [
        "*".repeat(10) + " COZINHA " + "*".repeat(10),
        `PEDIDO #${escapeHtml(String(ctx.orderNumber))}`,
        `${escapeHtml(ctx.orderType)} · ${escapeHtml(ctx.channel)}`,
        ctx.tableNumber ? `Mesa ${escapeHtml(ctx.tableNumber)}` : ctx.address ?? "",
        sep(),
        `CLIENTE: ${escapeHtml(ctx.customerName ?? "Avulso")}`,
        sep(),
        itemsBlock(ctx),
        sep(),
        ctx.notes ? `Obs: ${escapeHtml(ctx.notes)}\n` : "",
      ].join("\n")
      return doc("COZINHA", ctx, body, 80)
    }
    case "CASHIER_RECEIPT":
    case "DELIVERY_RECEIPT": {
      const title = type === "DELIVERY_RECEIPT" ? "RECIBO ENTREGA" : "RECIBO CAIXA"
      const body = [
        escapeHtml(ctx.storeName).toUpperCase(),
        title,
        `Pedido #${escapeHtml(String(ctx.orderNumber))} | ${fmtDateTime(ctx.createdAt)}`,
        `${escapeHtml(ctx.orderType)} · ${escapeHtml(ctx.channel)}`,
        sep(),
        `CLIENTE: ${escapeHtml(ctx.customerName ?? "Avulso")}${ctx.customerPhone ? ` · ${escapeHtml(ctx.customerPhone)}` : ""}`,
        sep(),
        "ITENS",
        sep(),
        itemsBlock(ctx),
        sep(),
        totalsBlock(ctx),
        sep(),
        footer(ctx),
      ].join("\n")
      return doc(title, ctx, body, ctx.widthMm ?? 80)
    }
    case "CANCELLATION": {
      const title = "CANCELAMENTO"
      const body = [
        title,
        `PEDIDO #${escapeHtml(String(ctx.orderNumber))}`,
        `${escapeHtml(ctx.orderType)} · ${escapeHtml(ctx.channel)}`,
        sep(),
        `CLIENTE: ${escapeHtml(ctx.customerName ?? "Avulso")}`,
        sep(),
        itemsBlock(ctx),
        sep(),
        ctx.notes ? `Motivo: ${escapeHtml(ctx.notes)}\n` : "",
        footer(ctx),
      ].join("\n")
      return doc(title, ctx, body, 80)
    }
    case "REPRINT": {
      const title = "REIMPRESSAO"
      const body = [
        title,
        `PEDIDO #${escapeHtml(String(ctx.orderNumber))}`,
        sep(),
        itemsBlock(ctx),
        sep(),
        totalsBlock(ctx),
        footer(ctx),
      ].join("\n")
      return doc(title, ctx, body, ctx.widthMm ?? 80)
    }
    case "TEST":
    default: {
      const title = "TESTE DE IMPRESSAO"
      const body = [
        title,
        `Loja: ${escapeHtml(ctx.storeName)}`,
        `Data: ${fmtDateTime(new Date().toISOString())}`,
        sep(),
        "Se este papel saiu, a impressora esta OK.",
        footer(ctx),
      ].join("\n")
      return doc(title, ctx, body, ctx.widthMm ?? 80)
    }
  }
}
