import "server-only"
import type { DbClient } from "../db"

export interface PrintRuleCreateInput {
  storeId: string
  printerId: string
  templateId: string
  event: string
  sector?: string | null
  isActive?: boolean
  sortOrder?: number
}

export interface PrintRuleUpdateInput {
  printerId?: string
  templateId?: string
  event?: string
  sector?: string | null
  isActive?: boolean
  sortOrder?: number
}

export const printRuleRepository = {
  create(db: DbClient, data: PrintRuleCreateInput) {
    return db.printRule.create({ data: {
      storeId:    data.storeId,
      printerId:  data.printerId,
      templateId: data.templateId,
      event:      data.event,
      sector:     data.sector ?? undefined,
      isActive:   data.isActive ?? true,
      sortOrder:  data.sortOrder ?? 0,
    }})
  },

  findMany(db: DbClient, storeId: string) {
    return db.printRule.findMany({
      where: { storeId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        printer:  { select: { id: true, name: true, type: true, interface: true } },
        template: { select: { id: true, name: true, type: true } },
      },
    })
  },

  findByEvent(db: DbClient, storeId: string, event: string) {
    return db.printRule.findMany({
      where: { storeId, event, isActive: true },
      orderBy: { sortOrder: "asc" },
      include: {
        printer:  true,
        template: true,
      },
    })
  },

  findById(db: DbClient, id: string) {
    return db.printRule.findUnique({ where: { id } })
  },

  update(db: DbClient, id: string, data: PrintRuleUpdateInput) {
    return db.printRule.update({ where: { id }, data })
  },

  delete(db: DbClient, id: string) {
    return db.printRule.delete({ where: { id } })
  },
}
