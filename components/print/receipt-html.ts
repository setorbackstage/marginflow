import type { OrderDetail } from "@/features/orders/types"
import { ORDER_TYPE_LABEL, ORDER_CHANNEL_LABEL } from "@/features/orders"

type ReceiptFormat = "A4" | "THERMAL_80MM" | "THERMAL_58MM"
export type PrintTemplate = "CUSTOMER_RECEIPT" | "KITCHEN_TICKET"

const PAGE_WIDTH: Record<ReceiptFormat, string> = {
  THERMAL_58MM: "58mm",
  THERMAL_80MM: "80mm",
  A4: "210mm",
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

  const typeLabel = ORDER_TYPE_LABEL[order.type] ?? order.type
  const channelLabel = order.channel === "MARKETPLACE" ? "iFood" : (ORDER_CHANNEL_LABEL[order.channel] ?? order.channel)

  const locationLine = order.type === "DINE_IN" && order.tableNumber
    ? `Mesa ${order.tableNumber}`
    : order.type === "DELIVERY" && order.deliveryAddress
      ? `${order.deliveryAddress.street}, ${order.deliveryAddress.number}${order.deliveryAddress.complement ? ` – ${order.deliveryAddress.complement}` : ""}`
      : typeLabel

  const customerLine = order.customer?.name ?? "Cliente avulso"

  const itemsRows = order.items.map((item) => {
    const qty = `${item.quantity}x`
    const nameRow = `${qty} ${item.productName}`
    const modRows = item.selectedModifiers.map((m) => `  + ${m.name}`).join("\n")
    const noteRow = item.notes ? `  Obs: ${item.notes}` : ""
    return [nameRow, modRows, noteRow].filter(Boolean).join("\n")
  }).join("\n\n")

  const notesBlock = order.notes ? `${sep}\nObs: ${order.notes}\n` : ""

  const body = [
    line("=", charWidth),
    `*** COZINHA ***`.padStart(Math.floor((charWidth + 14) / 2)).padEnd(charWidth),
    line("=", charWidth),
    `PEDIDO #${order.number}`,
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

  const typeLabel = ORDER_TYPE_LABEL[order.type] ?? order.type
  const channelLabel = ORDER_CHANNEL_LABEL[order.channel] ?? order.channel

  const locationLine = order.type === "DINE_IN" && order.tableNumber
    ? `Mesa ${order.tableNumber}`
    : order.type === "DELIVERY" && order.deliveryAddress
      ? `${order.deliveryAddress.street}, ${order.deliveryAddress.number}${order.deliveryAddress.complement ? ` – ${order.deliveryAddress.complement}` : ""}`
      : typeLabel

  const customerLine = order.customer
    ? `${order.customer.name}${order.customer.phone ? ` · ${order.customer.phone}` : ""}`
    : "Cliente avulso"

  const itemsRows = order.items.map((item) => {
    const baseRow = row(`${item.quantity}x ${item.productName}`, fmtCents(item.subtotal), charWidth)
    const modRows = item.selectedModifiers.map((m) => `  + ${m.name}`).join("\n")
    const noteRow = item.notes ? `  Obs: ${item.notes}` : ""
    return [baseRow, modRows, noteRow].filter(Boolean).join("\n")
  }).join("\n")

  const totalsRows = [
    row("Subtotal", fmtCents(order.itemsTotal), charWidth),
    order.discountTotal > 0 ? row("Desconto", `-${fmtCents(order.discountTotal)}`, charWidth) : "",
    order.deliveryFee > 0 ? row("Taxa de entrega", fmtCents(order.deliveryFee), charWidth) : "",
    row("TOTAL", fmtCents(order.grandTotal), charWidth),
  ].filter(Boolean).join("\n")

  const notesBlock = order.notes ? `${sep}\nObs: ${order.notes}\n` : ""

  const body = [
    line("=", charWidth),
    storeName.toUpperCase().padStart(Math.floor((charWidth + storeName.length) / 2)).padEnd(charWidth),
    line("=", charWidth),
    `Pedido #${order.number} | ${fmtDateTime(order.createdAt)}`,
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
