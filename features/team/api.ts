import { api } from "@/lib/api"
import type { InviteMemberInput, TeamListParams, TeamMemberDetail, TeamMemberListItem } from "./types"

function qs(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, value)
  }
  const s = search.toString()
  return s ? `?${s}` : ""
}

export const teamApi = {
  list: (storeId: string, params: TeamListParams) =>
    api.get<TeamMemberListItem[]>(`/stores/${storeId}/team${qs({ status: params.status, search: params.search })}`),
  get: (storeId: string, userId: string) => api.get<TeamMemberDetail>(`/stores/${storeId}/team/${userId}`),
  invite: (storeId: string, input: InviteMemberInput) => api.post(`/stores/${storeId}/team/invite`, input),
  changeRole: (storeId: string, userId: string, roleId: string) =>
    api.patch<TeamMemberDetail>(`/stores/${storeId}/team/${userId}/role`, { roleId }),
  revoke: (storeId: string, userId: string) => api.del(`/stores/${storeId}/team/${userId}`),
}
