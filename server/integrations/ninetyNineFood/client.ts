import "server-only"
import { logger } from "@/server/lib/logger"

const NINETYNINEFOOD_BASE_URL =
  process.env.NINETYNINEFOOD_BASE_URL || "https://openapi.99food.com"

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

export class NinetyNineFoodApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = "NinetyNineFoodApiError"
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Core fetch wrapper for the 99Food open API.
 * - Adds `Authorization: Bearer <token>` automatically.
 * - Retries on 5xx with exponential back-off.
 * - Respects `Retry-After` on 429.
 * - Never retries 4xx (caller must handle).
 */
export async function ninetyNineFoodFetch<T = unknown>(
  path: string,
  accessToken: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${NINETYNINEFOOD_BASE_URL}${path}`
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    Accept: "application/json",
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
      lastError =
        networkErr instanceof Error ? networkErr : new Error(String(networkErr))
      logger.warn("99food.fetch.network_error", { path, attempt, error: lastError.message })
      continue
    }

    if (res.status === 204) return {} as T

    if (res.status >= 500) {
      lastError = new NinetyNineFoodApiError(res.status, "SERVER_ERROR", `99Food 5xx on ${path}`)
      logger.warn("99food.fetch.server_error", { path, attempt, status: res.status })
      continue
    }

    if (res.status === 429) {
      const retryAfter = Number(res.headers.get("Retry-After") || "1")
      lastError = new NinetyNineFoodApiError(res.status, "RATE_LIMITED", `99Food 429 on ${path}`)
      await sleep(retryAfter * 1000)
      continue
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "")
      throw new NinetyNineFoodApiError(res.status, "CLIENT_ERROR", `99Food ${res.status} on ${path}: ${text}`)
    }

    const contentType = res.headers.get("content-type") || ""
    if (!contentType.includes("application/json")) return {} as T
    return (await res.json()) as T
  }

  throw lastError ?? new NinetyNineFoodApiError(0, "UNKNOWN", `99Food fetch failed on ${path}`)
}
