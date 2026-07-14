import "server-only"
import type { DbClient } from "../db"

export interface PrintJobCreateInput {
  storeId: string
  printerId: string
  templateId?: string | null
  orderId?: string | null
  type: string
  content?: string | null
  status?: string
}

export interface PrintJobFindManyOptions {
  page?:      number
  limit?:     number
  printerId?: string
  status?:    string
  type?:      string
  from?:      Date
  to?:        Date
}

export const printJobRepository = {
  create(db: DbClient, data: PrintJobCreateInput) {
    return db.printJob.create({ data: {
      storeId:    data.storeId,
      printerId:  data.printerId,
      templateId: data.templateId ?? undefined,
      orderId:    data.orderId ?? undefined,
      type:       data.type,
      content:    data.content ?? undefined,
      status:     data.status ?? "PENDING",
    }})
  },

  async findMany(db: DbClient, storeId: string, opts: PrintJobFindManyOptions = {}) {
    const { page = 1, limit = 50, printerId, status, type, from, to } = opts
    const where = {
      storeId,
      ...(printerId ? { printerId } : {}),
      ...(status    ? { status }    : {}),
      ...(type      ? { type }      : {}),
      ...(from || to ? { createdAt: {
        ...(from ? { gte: from } : {}),
        ...(to   ? { lte: to }  : {}),
      }} : {}),
    }
    const [items, total] = await Promise.all([
      db.printJob.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip:  (page - 1) * limit,
        take:  limit,
        include: {
          printer:  { select: { id: true, name: true, type: true } },
          template: { select: { id: true, name: true } },
        },
      }),
      db.printJob.count({ where }),
    ])
    return { items, total }
  },

  findById(db: DbClient, id: string) {
    return db.printJob.findUnique({
      where: { id },
      include: { printer: true, template: true },
    })
  },

  updateStatus(db: DbClient, id: string, status: string, error?: string | null) {
    return db.printJob.update({
      where: { id },
      data: {
        status,
        ...(error !== undefined ? { error } : {}),
        ...(status === "PRINTED" ? { printedAt: new Date() } : {}),
      },
    })
  },

  incrementAttempts(db: DbClient, id: string) {
    return db.printJob.update({
      where: { id },
      data: { attempts: { increment: 1 } },
    })
  },

  findPending(db: DbClient, storeId: string) {
    return db.printJob.findMany({
      where: { storeId, status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: { printer: true, template: true },
    })
  },
}
