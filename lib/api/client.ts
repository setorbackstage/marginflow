import { ApiError } from "./errors"
import { getAccessToken, setAccessToken, clearAccessToken } from "./token-store"

const BASE = "/api/v1"

/** Collection envelope pagination block — mirrors API_SPEC.md exactly. */
export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface Page<T> {
  items: T[]
  pagination: Pagination
}

interface RequestOptions {
  method?: string
  body?: unknown
  signal?: AbortSignal
  /** Internal: skip the 401→refresh→retry dance (used by the refresh call itself). */
  skipAuthRefresh?: boolean
  /** Internal: marks the single post-refresh retry so we never loop. */
  retried?: boolean
}

async function rawRequest(path: string, opts: RequestOptions): Promise<Response> {
  const headers: Record<string, string> = {}
  const token = getAccessToken()
  if (token) headers["Authorization"] = `Bearer ${token}`

  let body: BodyInit | undefined
  if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json"
    body = JSON.stringify(opts.body)
  }

  return fetch(`${BASE}${path}`, {
    method: opts.method ?? "GET",
    headers,
    body,
    // Send/receive the httpOnly refresh cookie on same-origin requests.
    credentials: "include",
    signal: opts.signal,
  })
}

// De-dupe concurrent refreshes: many queries can 401 at once on load, but only
// one `POST /auth/refresh` should run (it rotates the token single-use).
let refreshPromise: Promise<boolean> | null = null

async function tryRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await rawRequest("/auth/refresh", { method: "POST", skipAuthRefresh: true })
        if (!res.ok) {
          clearAccessToken()
          return false
        }
        const json = await res.json()
        setAccessToken(json?.data?.accessToken ?? null)
        return true
      } catch {
        clearAccessToken()
        return false
      } finally {
        refreshPromise = null
      }
    })()
  }
  return refreshPromise
}

const NO_REFRESH_PATHS = ["/auth/refresh", "/auth/login"]

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  let res = await rawRequest(path, opts)

  if (
    res.status === 401 &&
    !opts.skipAuthRefresh &&
    !opts.retried &&
    !NO_REFRESH_PATHS.includes(path)
  ) {
    const refreshed = await tryRefresh()
    if (refreshed) {
      res = await rawRequest(path, { ...opts, retried: true })
    }
  }

  return parse<T>(res)
}

async function parse<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T

  const text = await res.text()
  let json: unknown = null
  if (text) {
    try {
      json = JSON.parse(text)
    } catch {
      json = null
    }
  }

  if (!res.ok) {
    const err = (json as { error?: { code?: string; message?: string; details?: [] } } | null)?.error
    throw new ApiError(
      err?.code ?? "UNKNOWN_ERROR",
      err?.message ?? "An unexpected error occurred.",
      res.status,
      err?.details ?? [],
    )
  }

  return (json as { data?: T } | null)?.data as T
}

async function requestPage<T>(path: string, opts: RequestOptions = {}): Promise<Page<T>> {
  let res = await rawRequest(path, opts)
  if (res.status === 401 && !opts.retried && !NO_REFRESH_PATHS.includes(path)) {
    const refreshed = await tryRefresh()
    if (refreshed) res = await rawRequest(path, { ...opts, retried: true })
  }

  const text = await res.text()
  const json = text ? (JSON.parse(text) as { data?: T[]; pagination?: Pagination; error?: { code?: string; message?: string; details?: [] } }) : null
  if (!res.ok) {
    const err = json?.error
    throw new ApiError(err?.code ?? "UNKNOWN_ERROR", err?.message ?? "An unexpected error occurred.", res.status, err?.details ?? [])
  }
  return {
    items: json?.data ?? [],
    pagination:
      json?.pagination ?? { page: 1, limit: 0, total: json?.data?.length ?? 0, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
  }
}

/** Typed API client. All paths are relative to `/api/v1`. */
export const api = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>(path, { method: "GET", signal }),
  getPage: <T>(path: string, signal?: AbortSignal) => requestPage<T>(path, { method: "GET", signal }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body }),
  del: <T = void>(path: string) => request<T>(path, { method: "DELETE" }),
}
