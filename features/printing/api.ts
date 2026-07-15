import { api, type Page } from "@/lib/api"
import type { Printer, PrintTemplate, PrintRule, PrintJob, PrintJobListParams } from "./types"

function qs(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value))
  }
  const s = search.toString()
  return s ? `?${s}` : ""
}

export const printingApi = {
  // Printers
  listPrinters: (storeId: string): Promise<Printer[]> =>
    api.get<Printer[]>(`/stores/${storeId}/printers`),
  createPrinter: (storeId: string, data: Omit<Printer, "id" | "storeId" | "createdAt" | "updatedAt">): Promise<Printer> =>
    api.post<Printer>(`/stores/${storeId}/printers`, data),
  updatePrinter: (storeId: string, printerId: string, data: Partial<Omit<Printer, "id" | "storeId" | "createdAt" | "updatedAt">>): Promise<Printer> =>
    api.patch<Printer>(`/stores/${storeId}/printers/${printerId}`, data),
  deletePrinter: (storeId: string, printerId: string): Promise<void> =>
    api.del(`/stores/${storeId}/printers/${printerId}`),

  // Templates
  listTemplates: (storeId: string): Promise<PrintTemplate[]> =>
    api.get<PrintTemplate[]>(`/stores/${storeId}/print-templates`),
  createTemplate: (storeId: string, data: Omit<PrintTemplate, "id" | "storeId" | "createdAt" | "updatedAt">): Promise<PrintTemplate> =>
    api.post<PrintTemplate>(`/stores/${storeId}/print-templates`, data),
  updateTemplate: (storeId: string, templateId: string, data: Partial<Omit<PrintTemplate, "id" | "storeId" | "createdAt" | "updatedAt">>): Promise<PrintTemplate> =>
    api.patch<PrintTemplate>(`/stores/${storeId}/print-templates/${templateId}`, data),
  deleteTemplate: (storeId: string, templateId: string): Promise<void> =>
    api.del(`/stores/${storeId}/print-templates/${templateId}`),

  // Rules
  listRules: (storeId: string): Promise<PrintRule[]> =>
    api.get<PrintRule[]>(`/stores/${storeId}/print-rules`),
  createRule: (storeId: string, data: { printerId: string; templateId: string; event: string; sector?: string | null; isActive?: boolean; sortOrder?: number }): Promise<PrintRule> =>
    api.post<PrintRule>(`/stores/${storeId}/print-rules`, data),
  updateRule: (storeId: string, ruleId: string, data: Partial<{ printerId: string; templateId: string; event: string; sector: string | null; isActive: boolean; sortOrder: number }>): Promise<PrintRule> =>
    api.patch<PrintRule>(`/stores/${storeId}/print-rules/${ruleId}`, data),
  deleteRule: (storeId: string, ruleId: string): Promise<void> =>
    api.del(`/stores/${storeId}/print-rules/${ruleId}`),

  // Jobs
  listJobs: (storeId: string, params: PrintJobListParams = {}): Promise<Page<PrintJob>> =>
    api.getPage<PrintJob>(`/stores/${storeId}/print-jobs${qs({ ...params })}`),
  createJob: (storeId: string, data: { printerId: string; templateId?: string; orderId?: string; type: string; content?: string }): Promise<PrintJob> =>
    api.post<PrintJob>(`/stores/${storeId}/print-jobs`, data),
  updateJob: (storeId: string, jobId: string, action: "retry" | "cancel" | "complete" | "fail", error?: string): Promise<PrintJob> =>
    api.patch<PrintJob>(`/stores/${storeId}/print-jobs/${jobId}`, { action, error }),
  listPendingJobs: (storeId: string): Promise<PrintJob[]> =>
    api.get<PrintJob[]>(`/stores/${storeId}/print-jobs/pending`),
}
