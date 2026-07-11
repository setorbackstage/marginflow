"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useActiveStoreId } from "@/features/auth"
import { notificationsApi } from "./api"

const keys = {
  list: (storeId: string) => ["notifications", storeId] as const,
}

export function useNotifications(params?: { limit?: number; page?: number }) {
  const storeId = useActiveStoreId()
  return useQuery({
    queryKey: keys.list(storeId),
    enabled: Boolean(storeId),
    queryFn: () => notificationsApi.list(storeId, params),
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  })
}

export function useMarkAllRead() {
  const storeId = useActiveStoreId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(storeId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.list(storeId) }),
  })
}

export function useMarkRead() {
  const storeId = useActiveStoreId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (notificationId: string) => notificationsApi.markRead(storeId, notificationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.list(storeId) }),
  })
}

export function useDeleteNotification() {
  const storeId = useActiveStoreId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (notificationId: string) => notificationsApi.deleteNotification(storeId, notificationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.list(storeId) }),
  })
}
