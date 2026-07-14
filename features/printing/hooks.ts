"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useActiveStoreId } from "@/features/auth"
import { printingApi } from "./api"
import type { PrintJobListParams } from "./types"

export function usePrinters() {
  const storeId = useActiveStoreId()
  return useQuery({
    queryKey: ["stores", storeId, "printers"],
    queryFn:  () => printingApi.listPrinters(storeId),
  })
}

export function usePrintTemplates() {
  const storeId = useActiveStoreId()
  return useQuery({
    queryKey: ["stores", storeId, "print-templates"],
    queryFn:  () => printingApi.listTemplates(storeId),
  })
}

export function usePrintRules() {
  const storeId = useActiveStoreId()
  return useQuery({
    queryKey: ["stores", storeId, "print-rules"],
    queryFn:  () => printingApi.listRules(storeId),
  })
}

export function usePrintJobs(params: PrintJobListParams = {}) {
  const storeId = useActiveStoreId()
  return useQuery({
    queryKey: ["stores", storeId, "print-jobs", params],
    queryFn:  () => printingApi.listJobs(storeId, params),
  })
}

export function useUpdatePrintJob() {
  const storeId = useActiveStoreId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ jobId, action, error }: { jobId: string; action: "retry" | "cancel" | "complete" | "fail"; error?: string }) =>
      printingApi.updateJob(storeId, jobId, action, error),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["stores", storeId, "print-jobs"] })
    },
  })
}

export function useCreatePrinter() {
  const storeId = useActiveStoreId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof printingApi.createPrinter>[1]) =>
      printingApi.createPrinter(storeId, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["stores", storeId, "printers"] })
    },
  })
}

export function useUpdatePrinter() {
  const storeId = useActiveStoreId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ printerId, data }: { printerId: string; data: Parameters<typeof printingApi.updatePrinter>[2] }) =>
      printingApi.updatePrinter(storeId, printerId, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["stores", storeId, "printers"] })
    },
  })
}

export function useDeletePrinter() {
  const storeId = useActiveStoreId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (printerId: string) => printingApi.deletePrinter(storeId, printerId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["stores", storeId, "printers"] })
    },
  })
}

export function useCreatePrintRule() {
  const storeId = useActiveStoreId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof printingApi.createRule>[1]) =>
      printingApi.createRule(storeId, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["stores", storeId, "print-rules"] })
    },
  })
}

export function useDeletePrintRule() {
  const storeId = useActiveStoreId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ruleId: string) => printingApi.deleteRule(storeId, ruleId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["stores", storeId, "print-rules"] })
    },
  })
}
