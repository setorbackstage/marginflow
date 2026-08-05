import type { OrderDetail } from "@/features/orders/types"
import { ORDER_TYPE_LABEL, ORDER_CHANNEL_LABEL } from "@/features/orders"

type ReceiptFormat = "A4" | "THERMAL_80MM" | "THERMAL_58MM"
export type PrintTemplate = "CUSTOMER_RECEIPT" | "KITCHEN_TICKET"

const PAGE_WIDTH: Record<ReceiptFormat, string> = {
  THERMAL_58MM: "58mm",
  THERMAL_80MM: "80mm",
  A4: "210mm",
}

// SECURITY (VULN-009): every dynamic value that ends up inside the printed
// HTML must be HTML-escaped. The receipt is rendered in a browser print window,
// so an unescaped customer name / note / product could inject markup (XSS).
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

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—"
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(iso))
}

function line(char = "-", count = 32): string {
  return char.repeat(count)
}

/** Pads `left` and `right` to fit `width` chars, inserting dots between them. */
function row(left: string, right: string, width = 32): string {
  const gap = width - left.length - right.length
  if (gap <= 0) return `${left} ${right}`
  return left + " ".repeat(gap) + right
}

// ── Kitchen ticket ───────────────────────────────────────────────────────────

export function buildKitchenTicketHtml(order: OrderDetail, storeName: string, format: ReceiptFormat): string {
  const pageWidth = PAGE_WIDTH[format]
  const charWidth = format === "THERMAL_58MM" ? 28 : format === "THERMAL_80MM" ? 40 : 48
  const sep = line("-", charWidth)

  const typeLabel = escapeHtml(ORDER_TYPE_LABEL[order.type] ?? order.type)
  const rawChannel = order.channel === "MARKETPLACE" ? "iFood" : (ORDER_CHANNEL_LABEL[order.channel] ?? order.channel)
  const channelLabel = escapeHtml(rawChannel)

  const locationLine = order.type === "DINE_IN" && order.tableNumber
    ? `Mesa ${escapeHtml(order.tableNumber)}`
    : order.type === "DELIVERY" && order.deliveryAddress
      ? `${escapeHtml(order.deliveryAddress.street)}, ${escapeHtml(order.deliveryAddress.number)}${order.deliveryAddress.complement ? ` – ${escapeHtml(order.deliveryAddress.complement)}` : ""}`
      : typeLabel

  const customerLine = escapeHtml(order.customer?.name ?? "Cliente avulso")

  const itemsRows = order.items.map((item) => {
    const qty = `${item.quantity}x`
    const nameRow = `${qty} ${escapeHtml(item.productName)}`
    const modRows = item.selectedModifiers.map((m) => `  + ${escapeHtml(m.name)}`).join("\n")
    const noteRow = item.notes ? `  Obs: ${escapeHtml(item.notes)}` : ""
    return [nameRow, modRows, noteRow].filter(Boolean).join("\n")
  }).join("\n\n")

  const notesBlock = order.notes ? `${sep}\nObs: ${escapeHtml(order.notes)}\n` : ""

  const body = [
    line("=", charWidth),
    `*** COZINHA ***`.padStart(Math.floor((charWidth + 14) / 2)).padEnd(charWidth),
    line("=", charWidth),
    `PEDIDO #${escapeHtml(String(order.number))}`,
    `${typeLabel} · ${channelLabel}`,
    locationLine,
    sep,
    `CLIENTE: ${customerLine}`,
    sep,
    itemsRows,
    sep,
    notesBlock,
    "",
  ].join("\n")

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style>
  @page {
    size: ${pageWidth} auto;
    margin: 3mm;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: ${format === "A4" ? "14pt" : "11pt"};
    font-weight: bold;
    line-height: 1.6;
    color: #000;
    background: #fff;
    width: ${pageWidth};
  }
  pre {
    white-space: pre-wrap;
    word-break: break-all;
  }
</style>
</head>
<body>
<pre>${body}</pre>
</body>
</html>`
}

// ── Customer receipt ─────────────────────────────────────────────────────────

export function buildReceiptHtml(order: OrderDetail, storeName: string, format: ReceiptFormat): string {
  const pageWidth = PAGE_WIDTH[format]
  const charWidth = format === "THERMAL_58MM" ? 28 : format === "THERMAL_80MM" ? 40 : 48
  const sep = line("-", charWidth)

  const typeLabel = escapeHtml(ORDER_TYPE_LABEL[order.type] ?? order.type)
  const channelLabel = escapeHtml(ORDER_CHANNEL_LABEL[order.channel] ?? order.channel)

  const locationLine = order.type === "DINE_IN" && order.tableNumber
    ? `Mesa ${escapeHtml(order.tableNumber)}`
    : order.type === "DELIVERY" && order.deliveryAddress
      ? `${escapeHtml(order.deliveryAddress.street)}, ${escapeHtml(order.deliveryAddress.number)}${order.deliveryAddress.complement ? ` – ${escapeHtml(order.deliveryAddress.complement)}` : ""}`
      : typeLabel

  const customerLine = order.customer
    ? `${escapeHtml(order.customer.name)}${order.customer.phone ? ` · ${escapeHtml(order.customer.phone)}` : ""}`
    : "Cliente avulso"

  const itemsRows = order.items.map((item) => {
    const baseRow = row(`${item.quantity}x ${escapeHtml(item.productName)}`, fmtCents(item.subtotal), charWidth)
    const modRows = item.selectedModifiers.map((m) => `  + ${escapeHtml(m.name)}`).join("\n")
    const noteRow = item.notes ? `  Obs: ${escapeHtml(item.notes)}` : ""
    return [baseRow, modRows, noteRow].filter(Boolean).join("\n")
  }).join("\n")

  const totalsRows = [
    row("Subtotal", fmtCents(order.itemsTotal), charWidth),
    order.discountTotal > 0 ? row("Desconto", `-${fmtCents(order.discountTotal)}`, charWidth) : "",
    order.deliveryFee > 0 ? row("Taxa de entrega", fmtCents(order.deliveryFee), charWidth) : "",
    row("TOTAL", fmtCents(order.grandTotal), charWidth),
  ].filter(Boolean).join("\n")

  const notesBlock = order.notes ? `${sep}\nObs: ${escapeHtml(order.notes)}\n` : ""

  const safeStoreName = escapeHtml(storeName)

  const body = [
    line("=", charWidth),
    safeStoreName.toUpperCase().padStart(Math.floor((charWidth + safeStoreName.length) / 2)).padEnd(charWidth),
    line("=", charWidth),
    `Pedido #${escapeHtml(String(order.number))} | ${fmtDateTime(order.createdAt)}`,
    `${typeLabel} · ${channelLabel}`,
    locationLine,
    sep,
    "CLIENTE",
    customerLine,
    sep,
    "ITENS",
    sep,
    itemsRows,
    sep,
    totalsRows,
    line("=", charWidth),
    notesBlock,
    "",
  ].join("\n")

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style>
  @page {
    size: ${pageWidth} auto;
    margin: 3mm;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: ${format === "A4" ? "11pt" : "9pt"};
    line-height: 1.4;
    color: #000;
    background: #fff;
    width: ${pageWidth};
  }
  pre {
    white-space: pre-wrap;
    word-break: break-all;
  }
</style>
</head>
<body>
<pre>${body}</pre>
</body>
</html>`
}
