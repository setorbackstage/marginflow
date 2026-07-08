import "server-only"
import { prisma } from "@/server/db"
import { logger } from "@/server/lib/logger"
import { IfoodApiError } from "./client"

const IFOOD_BASE_URL = "https://merchant-api.ifood.com.br"
/** Refresh token 5 minutes before actual expiry to avoid clock skew. */
const EXPIRY_BUFFER_MS = 5 * 60 * 1000

export interface IfoodTokenResponse {
  accessToken: string
  tokenType: string
  expiresIn: number
}

/**
 * Returns a valid iFood access token for the centralized application.
 * Reads from the DB cache first; requests a new token only when expired or missing.
 *
 * clientId and clientSecret come from environment variables:
 *   IFOOD_CLIENT_ID / IFOOD_CLIENT_SECRET
 */
export async function getIfoodAccessToken(): Promise<string> {
  const config = await prisma.marketplaceAppConfig.findUnique({ where: { platform: "IFOOD" } })

  if (config?.accessToken && config.tokenExpiresAt) {
    const expiresAt = new Date(config.tokenExpiresAt).getTime()
    if (Date.now() + EXPIRY_BUFFER_MS < expiresAt) {
      return config.accessToken
    }
  }

  return refreshIfoodToken()
}

async function refreshIfoodToken(): Promise<string> {
  const clientId = process.env.IFOOD_CLIENT_ID
  const clientSecret = process.env.IFOOD_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error("IFOOD_CLIENT_ID or IFOOD_CLIENT_SECRET environment variables are not set.")
  }

  logger.info("ifood.auth.refreshing_token")

  const body = new URLSearchParams({
    grantType: "client_credentials",
    clientId,
    clientSecret,
  })

  const res = await fetch(`${IFOOD_BASE_URL}/authentication/v1.0/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new IfoodApiError(res.status, "AUTH_FAILED", `iFood auth failed: ${text}`)
  }

  const data = (await res.json()) as IfoodTokenResponse
  const expiresAt = new Date(Date.now() + data.expiresIn * 1000)

  await prisma.marketplaceAppConfig.upsert({
    where: { platform: "IFOOD" },
    create: {
      platform: "IFOOD",
      accessToken: data.accessToken,
      tokenExpiresAt: expiresAt,
    },
    update: {
      accessToken: data.accessToken,
      tokenExpiresAt: expiresAt,
    },
  })

  logger.info("ifood.auth.token_refreshed", { expiresAt: expiresAt.toISOString() })
  return data.accessToken
}
