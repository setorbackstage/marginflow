import "server-only"
import type { DbClient } from "../db"
import { BadRequestError, NotFoundError } from "../lib/errors"
import { printJobRepository } from "./print-job.repository"
import { printRuleRepository } from "./print-rule.repository"
import type { PrintJobCreateInput, PrintJobFindManyOptions } from "./print-job.repository"

export const printJobService = {
  async list(db: DbClient, storeId: string, opts: PrintJobFindManyOptions = {}) {
    return printJobRepository.findMany(db, storeId, opts)
  },

  async getById(db: DbClient, storeId: string, jobId: string) {
    const job = await printJobRepository.findById(db, jobId)
    if (!job || job.storeId !== storeId) {
      throw new NotFoundError("PRINT_JOB_NOT_FOUND", "Job de impressão não encontrado.")
    }
    return job
  },

  async create(db: DbClient, data: PrintJobCreateInput) {
    return printJobRepository.create(db, data)
  },

  async createFromEvent(db: DbClient, storeId: string, event: string, orderId?: string | null) {
    const rules = await printRuleRepository.findByEvent(db, storeId, event)
    const jobs = []
    for (const rule of rules) {
      const job = await printJobRepository.create(db, {
        storeId,
        printerId:  rule.printerId,
        templateId: rule.templateId,
        orderId:    orderId ?? undefined,
        type:       event.split(".")[0].toUpperCase() as string,
        status:     "PENDING",
      })
      jobs.push(job)
    }
    return jobs
  },

  async updateStatus(db: DbClient, storeId: string, jobId: string, status: string, error?: string | null) {
    await printJobService.getById(db, storeId, jobId)
    return printJobRepository.updateStatus(db, jobId, status, error)
  },

  async retry(db: DbClient, storeId: string, jobId: string) {
    const job = await printJobService.getById(db, storeId, jobId)
    if (!["ERROR", "CANCELLED"].includes(job.status)) {
      throw new BadRequestError("INVALID_JOB_STATUS", "Só é possível retentar jobs com status ERROR ou CANCELLED.")
    }
    await printJobRepository.incrementAttempts(db, jobId)
    return printJobRepository.updateStatus(db, jobId, "PENDING", null)
  },

  async cancel(db: DbClient, storeId: string, jobId: string) {
    const job = await printJobService.getById(db, storeId, jobId)
    if (!["PENDING", "ERROR"].includes(job.status)) {
      throw new BadRequestError("INVALID_JOB_STATUS", "Só é possível cancelar jobs com status PENDING ou ERROR.")
    }
    return printJobRepository.updateStatus(db, jobId, "CANCELLED", null)
  },

  async listPending(db: DbClient, storeId: string) {
    return printJobRepository.findPending(db, storeId)
  },
}
