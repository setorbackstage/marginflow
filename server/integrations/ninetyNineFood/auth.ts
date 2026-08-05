import "server-only"
import { prisma } from "@/server/db"
import { logger } from "@/server/lib/logger"
import { NinetyNineFoodApiError } from "./client"

const NINETYNINEFOOD_BASE_URL =
  process.env.NINETYNINEFOOD_BASE_URL || "https://openapi.99food.com"

/** Refresh the cached token 5 minutes before actual expiry to avoid clock skew. */
const EXPIRY_BUFFER_MS = 5 * 60 * 1000

export interface NinetyNineFoodTokenResponse {
  auth_token: string
  expires_in?: number
}

/**
 * Returns a valid 99Food access token scoped to a single store's app credentials.
 * 99Food auth uses app_id/app_secret (per connected shop) and returns an
 * `auth_token` via GET /v1/auth/authtoken/get. The token is cached per store
 * in `marketplaceAppConfig` keyed by platform = "99FOOD" + storeId.
 */
export async function getNinetyNineFoodAccessToken(storeId: string): Promise<string> {
  const config = await prisma.marketplaceAppConfig.findUnique({
    where: { storeId_platform: { storeId, platform: "99FOOD" } },
  })

  if (config?.accessToken && config.tokenExpiresAt) {
    const expiresAt = new Date(config.tokenExpiresAt).getTime()
    if (Date.now() + EXPIRY_BUFFER_MS < expiresAt) {
      return config.accessToken
    }
  }

  return refreshNinetyNineFoodToken(storeId)
}

async function refreshNinetyNineFoodToken(storeId: string): Promise<string> {
  const appId = process.env.NINETYNINEFOOD_APP_ID
  const appSecret = process.env.NINETYNINEFOOD_APP_SECRET

  if (!appId || !appSecret) {
    throw new Error(
      "NINETYNINEFOOD_APP_ID or NINETYNINEFOOD_APP_SECRET environment variables are not set.",
    )
  }

  logger.info("99food.auth.refreshing_token", { storeId })

  const url = `${NINETYNINEFOOD_BASE_URL}/v1/auth/authtoken/get?app_id=${encodeURIComponent(
    appId,
  )}&app_secret=${encodeURIComponent(appSecret)}`

  const res = await fetch(url, { method: "GET", headers: { Accept: "application/json" } })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new NinetyNineFoodApiError(res.status, "AUTH_FAILED", `99Food auth failed: ${text}`)
  }

  const data = (await res.json()) as NinetyNineFoodTokenResponse
  const authToken = data.auth_token
  if (!authToken) {
    throw new NinetyNineFoodApiError(502, "NO_TOKEN", "99Food did not return auth_token.")
  }

  // 99Food tokens are long-lived; default to 24h if not provided.
  const expiresAt = new Date(Date.now() + (data.expires_in ?? 86400) * 1000)

  await prisma.marketplaceAppConfig.upsert({
    where: { storeId_platform: { storeId, platform: "99FOOD" } },
    create: {
      storeId,
      platform: "99FOOD",
      accessToken: authToken,
      tokenExpiresAt: expiresAt,
    },
    update: {
      accessToken: authToken,
      tokenExpiresAt: expiresAt,
    },
  })

  logger.info("99food.auth.token_refreshed", { storeId, expiresAt: expiresAt.toISOString() })
  return authToken
}
