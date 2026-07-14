import "server-only"
import type { DbClient } from "../db"

export interface PrinterCreateInput {
  storeId: string
  name: string
  type?: string
  model?: string | null
  interface: string
  address?: string | null
  isDefault?: boolean
  isActive?: boolean
}

export interface PrinterUpdateInput {
  name?: string
  type?: string
  model?: string | null
  interface?: string
  address?: string | null
  isDefault?: boolean
  isActive?: boolean
}

export const printerRepository = {
  create(db: DbClient, data: PrinterCreateInput) {
    return db.printer.create({ data: {
      storeId:   data.storeId,
      name:      data.name,
      type:      data.type ?? "GENERAL",
      model:     data.model ?? undefined,
      interface: data.interface,
      address:   data.address ?? undefined,
      isDefault: data.isDefault ?? false,
      isActive:  data.isActive ?? true,
    }})
  },

  findMany(db: DbClient, storeId: string) {
    return db.printer.findMany({
      where: { storeId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    })
  },

  findById(db: DbClient, id: string) {
    return db.printer.findUnique({ where: { id } })
  },

  update(db: DbClient, id: string, data: PrinterUpdateInput) {
    return db.printer.update({ where: { id }, data })
  },

  delete(db: DbClient, id: string) {
    return db.printer.delete({ where: { id } })
  },

  clearDefault(db: DbClient, storeId: string) {
    return db.printer.updateMany({ where: { storeId, isDefault: true }, data: { isDefault: false } })
  },
}
