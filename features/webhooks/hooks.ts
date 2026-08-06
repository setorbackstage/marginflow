import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useActiveStoreId } from "@/features/auth"
import { webhooksApi } from "./api"

export const webhookKeys = {
  list: (storeId: string) => ["webhooks", storeId] as const,
}

export function useWebhooks() {
  const storeId = useActiveStoreId()
  return useQuery({
    queryKey: webhookKeys.list(storeId ?? ""),
    enabled: Boolean(storeId),
    queryFn: async () => {
      const res = await webhooksApi.list(storeId!)
      return res
    },
  })
}

export function useCreateWebhook() {
  const storeId = useActiveStoreId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { url: string; events: string[] }) =>
      webhooksApi.create(storeId!, input.url, input.events),
    onSuccess: () => qc.invalidateQueries({ queryKey: webhookKeys.list(storeId!) }),
  })
}

export function useDeleteWebhook() {
  const storeId = useActiveStoreId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => webhooksApi.remove(storeId!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: webhookKeys.list(storeId!) }),
  })
}
