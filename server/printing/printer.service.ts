import "server-only"
import type { DbClient } from "../db"
import { NotFoundError } from "../lib/errors"
import { printerRepository } from "./printer.repository"
import type { PrinterCreateInput, PrinterUpdateInput } from "./printer.repository"

export const printerService = {
  async list(db: DbClient, storeId: string) {
    return printerRepository.findMany(db, storeId)
  },

  async getById(db: DbClient, storeId: string, printerId: string) {
    const printer = await printerRepository.findById(db, printerId)
    if (!printer || printer.storeId !== storeId) {
      throw new NotFoundError("PRINTER_NOT_FOUND", "Impressora não encontrada.")
    }
    return printer
  },

  async create(db: DbClient, storeId: string, input: Omit<PrinterCreateInput, "storeId">) {
    if (input.isDefault) {
      await printerRepository.clearDefault(db, storeId)
    }
    return printerRepository.create(db, { ...input, storeId })
  },

  async update(db: DbClient, storeId: string, printerId: string, input: PrinterUpdateInput) {
    const existing = await printerService.getById(db, storeId, printerId)
    if (input.isDefault && !existing.isDefault) {
      await printerRepository.clearDefault(db, storeId)
    }
    return printerRepository.update(db, printerId, input)
  },

  async delete(db: DbClient, storeId: string, printerId: string) {
    await printerService.getById(db, storeId, printerId)
    return printerRepository.delete(db, printerId)
  },
}
