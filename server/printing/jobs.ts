/**
 * Construção de PrintContext e enfileiramento de jobs (ETAPAS 3, 5).
 *
 * Aqui resolvemos os dados do pedido para o template (sem espalhar lógica de
 * negócio pela UI) e criamos o PrintJob na fila. A impressão apenas REAGE: este
 * módulo é chamado pelos event listeners, nunca diretamente da UI.
 */
import "server-only"
import type { DbClient } from "../db"
import type { PrintContext, PrintDocumentType } from "./types"
import { printJobRepository } from "./print-job.repository"
import { getStorePrintConfig } from "./config"
import { prisma } from "../db"

/** Monta o PrintContext a partir do pedido (dados já resolvidos). */
export async function buildPrintContext(
  db: DbClient,
  storeId: string,
  orderId: string,
  _documentType: PrintDocumentType,
): Promise<PrintContext | null> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  })
  if (!order || order.storeId !== storeId) return null

  const config = await getStorePrintConfig(db, storeId)
  const store = await db.store.findUnique({ where: { id: storeId } })

  const addr = (order.deliveryAddress ?? null) as
    | { street?: string; number?: string; complement?: string }
    | null

  return {
    storeName: store?.name ?? "MarginFlow",
    orderNumber: order.number,
    orderType: order.type,
    channel: order.channel,
    customerName: order.customerName ?? null,
    customerPhone: order.customerPhone ?? null,
    address: addr ? `${addr.street ?? ""}, ${addr.number ?? ""}${addr.complement ? ` – ${addr.complement}` : ""}` : null,
    tableNumber: order.tableNumber ?? null,
    items: order.items.map((it) => ({
      quantity: it.quantity,
      name: it.productName,
      notes: it.notes,
      modifiers: [],
    })),
    subtotal: order.itemsTotal,
    discount: order.discountTotal,
    deliveryFee: order.deliveryFee,
    total: order.grandTotal,
    notes: order.notes,
    createdAt: order.createdAt?.toISOString?.() ?? null,
    logoUrl: config.logoUrl,
    qrCodeEnabled: config.qrCodeEnabled,
    footerText: config.footerText,
    thankYouMessage: config.thankYouMessage,
    widthMm: config.defaultWidthMm,
  }
}

/** Cria um job na fila (PENDING) para um documento de um pedido. */
export async function enqueueOrderPrint(
  db: DbClient,
  storeId: string,
  printerId: string,
  orderId: string,
  documentType: PrintDocumentType,
  templateId?: string | null,
): Promise<void> {
  await printJobRepository.create(db, {
    storeId,
    printerId,
    templateId: templateId ?? undefined,
    orderId,
    type: documentTypeToLegacyType(documentType),
    documentType,
    provider: (await getStorePrintConfig(db, storeId)).provider,
    destination: printerId,
    status: "PENDING",
  })
}

/** Cria um job de teste (sem pedido). */
export async function enqueueTestPrint(
  db: DbClient,
  storeId: string,
  printerId: string,
  templateId?: string | null,
): Promise<string> {
  const job = await printJobRepository.create(db, {
    storeId,
    printerId,
    templateId: templateId ?? undefined,
    type: "TEST",
    documentType: "TEST",
    provider: (await getStorePrintConfig(db, storeId)).provider,
    destination: printerId,
    status: "PENDING",
  })
  return job.id
}

function documentTypeToLegacyType(t: PrintDocumentType): string {
  switch (t) {
    case "KITCHEN_TICKET":
      return "KITCHEN"
    case "CASHIER_RECEIPT":
      return "RECEIPT"
    case "DELIVERY_RECEIPT":
      return "DELIVERY"
    case "CANCELLATION":
      return "CANCELLATION"
    case "REPRINT":
      return "RECEIPT"
    case "TEST":
    default:
      return "TEST"
  }
}
