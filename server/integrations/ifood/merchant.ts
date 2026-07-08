import "server-only"
import { ifoodFetch } from "./client"

/**
 * Pausa a loja no iFood (para de receber pedidos temporariamente).
 * Endpoint: POST /merchant/v1.0/merchants/{merchantId}/statuses
 * Body: { operation: "CLOSE" }
 * Nota: verificar no Portal do Desenvolvedor iFood se o endpoint mudou.
 */
export function pauseIfoodStore(accessToken: string, merchantId: string): Promise<void> {
  return ifoodFetch(`/merchant/v1.0/merchants/${merchantId}/statuses`, accessToken, {
    method: "POST",
    body: JSON.stringify({ operation: "CLOSE" }),
  })
}

/**
 * Retoma a loja no iFood (volta a receber pedidos).
 * Endpoint: POST /merchant/v1.0/merchants/{merchantId}/statuses
 * Body: { operation: "OPEN" }
 */
export function resumeIfoodStore(accessToken: string, merchantId: string): Promise<void> {
  return ifoodFetch(`/merchant/v1.0/merchants/${merchantId}/statuses`, accessToken, {
    method: "POST",
    body: JSON.stringify({ operation: "OPEN" }),
  })
}
