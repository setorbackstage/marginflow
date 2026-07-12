import { api, type Page } from "@/lib/api"
import type { AuditLogEntry, AuditLogListParams } from "./types"

function qs(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value))
  }
  const s = search.toString()
  return s ? `?${s}` : ""
}

export const auditApi = {
  list: (storeId: string, params: AuditLogListParams = {}): Promise<Page<AuditLogEntry>> =>
    api.getPage<AuditLogEntry>(
      `/stores/${storeId}/audit${qs({
        page:       params.page,
        limit:      params.limit,
        action:     params.action,
        entityType: params.entityType,
        from:       params.from,
        to:         params.to,
      })}`,
    ),
}
