"use client"

import { useQuery } from "@tanstack/react-query"
import { useActiveStoreId } from "@/features/auth"
import { auditApi } from "./api"
import type { AuditLogListParams } from "./types"

export function useAuditLogs(params: AuditLogListParams = {}) {
  const storeId = useActiveStoreId()
  return useQuery({
    queryKey: ["audit", storeId, params],
    queryFn:  () => auditApi.list(storeId, params),
    enabled:  !!storeId,
  })
}
