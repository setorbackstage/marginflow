import { api } from "@/lib/api"
import type { Notification, NotificationListResponse } from "./types"

function qs(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value))
  }
  const s = search.toString()
  return s ? `?${s}` : ""
}

export const notificationsApi = {
  list: (storeId: string, params?: { limit?: number; page?: number }): Promise<NotificationListResponse> =>
    api.get<NotificationListResponse>(
      `/stores/${storeId}/notifications${qs({ limit: params?.limit, page: params?.page })}`,
    ),
  markRead: (storeId: string, notificationId: string): Promise<Notification> =>
    api.patch<Notification>(`/stores/${storeId}/notifications/${notificationId}/read`, {}),
  markAllRead: (storeId: string): Promise<{ marked: number }> =>
    api.post<{ marked: number }>(`/stores/${storeId}/notifications/read-all`, {}),
  deleteNotification: (storeId: string, notificationId: string): Promise<void> =>
    api.del(`/stores/${storeId}/notifications/${notificationId}`),
}
