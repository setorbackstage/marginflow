import "server-only"
import type { DbClient } from "../db"
import { NotFoundError } from "../lib/errors"
import { printRuleRepository } from "./print-rule.repository"
import type { PrintRuleCreateInput, PrintRuleUpdateInput } from "./print-rule.repository"

export const printRuleService = {
  async list(db: DbClient, storeId: string) {
    return printRuleRepository.findMany(db, storeId)
  },

  async getById(db: DbClient, storeId: string, ruleId: string) {
    const rule = await printRuleRepository.findById(db, ruleId)
    if (!rule || rule.storeId !== storeId) {
      throw new NotFoundError("PRINT_RULE_NOT_FOUND", "Regra de impressão não encontrada.")
    }
    return rule
  },

  async create(db: DbClient, storeId: string, input: Omit<PrintRuleCreateInput, "storeId">) {
    return printRuleRepository.create(db, { ...input, storeId })
  },

  async update(db: DbClient, storeId: string, ruleId: string, input: PrintRuleUpdateInput) {
    await printRuleService.getById(db, storeId, ruleId)
    return printRuleRepository.update(db, ruleId, input)
  },

  async delete(db: DbClient, storeId: string, ruleId: string) {
    await printRuleService.getById(db, storeId, ruleId)
    return printRuleRepository.delete(db, ruleId)
  },
}
