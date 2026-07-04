import "server-only"
import type { DbClient } from "../db"
import type { Invoice, Prisma } from "../../generated/prisma/client"
import type { PaginationParams } from "./pagination"

/**
 * Pure data access for the `invoices` table. No business rules here. No
 * delete method — DATA_MODEL.md: an Invoice is immutable after issuance;
 * corrections happen by issuing a new Invoice, never by removing this one.
 */
export const invoiceRepository = {
  findById(db: DbClient, id: string): Promise<Invoice | null> {
    return db.invoice.findUnique({ where: { id } })
  },

  exists(db: DbClient, id: string): Promise<boolean> {
    return db.invoice.findUnique({ where: { id }, select: { id: true } }).then(Boolean)
  },

  /** `order_id` is unique — at most one Invoice per Order. */
  findByOrderId(db: DbClient, orderId: string): Promise<Invoice | null> {
    return db.invoice.findUnique({ where: { orderId } })
  },

  /** `access_key` is unique when not null — the 44-digit chave de acesso. */
  findByAccessKey(db: DbClient, accessKey: string): Promise<Invoice | null> {
    return db.invoice.findUnique({ where: { accessKey } })
  },

  findManyByStore(
    db: DbClient,
    storeId: string,
    params: PaginationParams & { where?: Prisma.InvoiceWhereInput; orderBy?: Prisma.InvoiceOrderByWithRelationInput } = {},
  ): Promise<Invoice[]> {
    return db.invoice.findMany({
      where: { storeId, ...params.where },
      orderBy: params.orderBy ?? { createdAt: "desc" },
      skip: params.skip,
      take: params.take,
    })
  },

  count(db: DbClient, storeId: string, where: Prisma.InvoiceWhereInput = {}): Promise<number> {
    return db.invoice.count({ where: { storeId, ...where } })
  },

  create(db: DbClient, data: Prisma.InvoiceCreateInput): Promise<Invoice> {
    return db.invoice.create({ data })
  },

  update(db: DbClient, id: string, data: Prisma.InvoiceUpdateInput): Promise<Invoice> {
    return db.invoice.update({ where: { id }, data })
  },
}
