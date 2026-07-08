import "server-only"
import { ifoodFetch } from "./client"

/**
 * Atualiza a disponibilidade de um item no cardápio do iFood.
 * Endpoint: PUT /catalog/v2.0/merchants/{merchantId}/items/{externalCode}
 * Body: { available: boolean }
 * Ref: iFood Catalog API v2.0 — verificar no Portal do Desenvolvedor se o endpoint mudou.
 */
export function setIfoodItemAvailability(
  accessToken: string,
  merchantId: string,
  externalCode: string,
  available: boolean,
): Promise<void> {
  return ifoodFetch(
    `/catalog/v2.0/merchants/${merchantId}/items/${externalCode}`,
    accessToken,
    {
      method: "PUT",
      body: JSON.stringify({ available }),
    },
  )
}
