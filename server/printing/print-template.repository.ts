import "server-only"
import type { DbClient } from "../db"
import type { Prisma } from "../../generated/prisma/client"

export interface PrintTemplateCreateInput {
  storeId: string
  name: string
  type: string
  layout?: Prisma.InputJsonValue
  isActive?: boolean
}

export interface PrintTemplateUpdateInput {
  name?: string
  type?: string
  layout?: Prisma.InputJsonValue
  isActive?: boolean
}

export const printTemplateRepository = {
  create(db: DbClient, data: PrintTemplateCreateInput) {
    return db.printTemplate.create({ data: {
      storeId:  data.storeId,
      name:     data.name,
      type:     data.type,
      layout:   data.layout ?? {},
      isActive: data.isActive ?? true,
    }})
  },

  findMany(db: DbClient, storeId: string) {
    return db.printTemplate.findMany({
      where: { storeId },
      orderBy: { createdAt: "asc" },
    })
  },

  findById(db: DbClient, id: string) {
    return db.printTemplate.findUnique({ where: { id } })
  },

  update(db: DbClient, id: string, data: PrintTemplateUpdateInput) {
    return db.printTemplate.update({ where: { id }, data })
  },

  delete(db: DbClient, id: string) {
    return db.printTemplate.delete({ where: { id } })
  },
}
