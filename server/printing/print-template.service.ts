import "server-only"
import type { DbClient } from "../db"
import { NotFoundError } from "../lib/errors"
import { printTemplateRepository } from "./print-template.repository"
import type { PrintTemplateCreateInput, PrintTemplateUpdateInput } from "./print-template.repository"

export const printTemplateService = {
  async list(db: DbClient, storeId: string) {
    return printTemplateRepository.findMany(db, storeId)
  },

  async getById(db: DbClient, storeId: string, templateId: string) {
    const tpl = await printTemplateRepository.findById(db, templateId)
    if (!tpl || tpl.storeId !== storeId) {
      throw new NotFoundError("PRINT_TEMPLATE_NOT_FOUND", "Template não encontrado.")
    }
    return tpl
  },

  async create(db: DbClient, storeId: string, input: Omit<PrintTemplateCreateInput, "storeId">) {
    return printTemplateRepository.create(db, { ...input, storeId })
  },

  async update(db: DbClient, storeId: string, templateId: string, input: PrintTemplateUpdateInput) {
    await printTemplateService.getById(db, storeId, templateId)
    return printTemplateRepository.update(db, templateId, input)
  },

  async delete(db: DbClient, storeId: string, templateId: string) {
    await printTemplateService.getById(db, storeId, templateId)
    return printTemplateRepository.delete(db, templateId)
  },
}
