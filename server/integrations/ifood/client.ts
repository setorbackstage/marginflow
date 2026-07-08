import "server-only"
import { logger } from "@/server/lib/logger"

const IFOOD_BASE_URL = "https://merchant-api.ifood.com.br"
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

export class IfoodApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = "IfoodApiError"
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Core fetch wrapper for the iFood Merchant API.
 * - Adds `Authorization: Bearer` header automatically.
 * - Retries on 5xx with exponential back-off.
 * - Respects `Retry-After` on 429.
 * - Never retries 4xx (caller must handle).
 */
export async function ifoodFetch<T = unknown>(
  path: string,
  accessToken: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${IFOOD_BASE_URL}${path}`
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  }

  let lastError: Error | null = null

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await sleep(RETRY_DELAY_MS * 2 ** (attempt - 1))
    }

    let res: Response
    try {
      res = await fetch(url, { ...options, headers })
    } catch (networkErr) {
      lastError = networkErr instanceof Error ? networkErr : new Error(String(networkErr))
      logger.warn("ifood.fetch.network_error", { path, attempt, error: lastError.message })
      continue
    }

    // 204 No Content — no body, return empty object
    if (res.status === 204) return {} as T

    // 429 Too Many Requests — wait for Retry-After then retry
    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get("Retry-After") ?? "30", 10)
      logger.warn("ifood.fetch.rate_limited", { path, retryAfterSec: retryAfter })
      await sleep(retryAfter * 1000)
      continue
    }

    // 5xx — retry with back-off
    if (res.status >= 500) {
      const body = await res.text().catch(() => "")
      lastError = new IfoodApiError(res.status, "SERVER_ERROR", body || `HTTP ${res.status}`)
      logger.warn("ifood.fetch.server_error", { path, status: res.status, attempt })
      continue
    }

    // 4xx — do not retry; surface immediately
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as Record<string, unknown>
      const code = String(body["code"] ?? body["error"] ?? "IFOOD_ERROR")
      const message = String(body["message"] ?? body["error_description"] ?? `HTTP ${res.status}`)
      throw new IfoodApiError(res.status, code, message)
    }

    // 2xx success
    const text = await res.text()
    if (!text) return {} as T
    return JSON.parse(text) as T
  }

  throw lastError ?? new IfoodApiError(500, "UNKNOWN", `iFood request failed after ${MAX_RETRIES} attempts: ${path}`)
}
