/**
 * POST /api/webhooks/ifood
 *
 * Receives push events from the iFood Webhook API (v1.0).
 * iFood sends an array of IfoodEvent objects whenever a restaurant has
 * pending events (PLACED, CANCELLED, DISPATCHED, CONCLUDED, KEEPALIVE).
 *
 * The endpoint MUST return 200 quickly — iFood retries delivery on failures.
 * We process events synchronously here; the cron job (every minute) is the
 * safety net for any events that arrive while this endpoint is down.
 *
 * Register https://marginflow-os.vercel.app/api/webhooks/ifood in the iFood
 * Developer Portal to receive push events.
 */
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { timingSafeEqual, createHash } from "node:crypto"
import { processIfoodEvents } from "@/server/services"
import type { IfoodEvent } from "@/server/integrations/ifood"
import { logger, logAudit } from "@/server/lib"
import { prisma } from "@/server/db"
import { env } from "@/config/env"

// ---------------------------------------------------------------------------
// Verificação de segredo compartilhado — header x-ifood-webhook-secret.
//
// SECURITY (VULN-005): a verificação NUNCA é pulada. Se a secret não está
// configurada no servidor, o endpoint responde 503 (app não pronto). A
// comparação usa timingSafeEqual sobre hashes SHA-256 de tamanho fixo.
// ---------------------------------------------------------------------------

function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex")
}

function verifyWebhookSecret(req: NextRequest): { ok: boolean; configured: boolean } {
  const expected = env.IFOOD_WEBHOOK_SECRET
  if (!expected) {
    return { ok: false, configured: false }
  }
  const incoming = req.headers.get("x-ifood-webhook-secret")
  if (!incoming) {
    return { ok: false, configured: true }
  }
  const a = Buffer.from(sha256Hex(expected))
  const b = Buffer.from(sha256Hex(incoming))
  if (a.length !== b.length) return { ok: false, configured: true }
  return { ok: timingSafeEqual(a, b), configured: true }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const result = verifyWebhookSecret(req)
  if (!result.ok) {
    const ip = req.headers.get("x-forwarded-for") ?? "unknown"
    if (!result.configured) {
      logger.error("ifood.webhook.secret_not_configured", { ip })
      void logAudit(prisma, {
        storeId: "system",
        userId: "system",
        action: "webhook.rejected",
        entityType: "Webhook",
        entityId: "ifood",
        entityRef: "secret_not_configured",
      })
      return NextResponse.json(
        { error: "Webhook authentication is not configured on the server." },
        { status: 503 },
      )
    }
    logger.warn("ifood.webhook.unauthorized", { ip })
    void logAudit(prisma, {
      storeId: "system",
      userId: "system",
      action: "webhook.rejected",
      entityType: "Webhook",
      entityId: "ifood",
      entityRef: "invalid_secret",
    })
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  void logAudit(prisma, {
    storeId: "system",
    userId: "system",
    action: "webhook.received",
    entityType: "Webhook",
    entityId: "ifood",
    entityRef: "authenticated",
  })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  // iFood may send a single object or an array; normalise to array.
  const events: IfoodEvent[] = Array.isArray(body) ? body : [body as IfoodEvent]

  if (events.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 })
  }

  try {
    await processIfoodEvents(events)
    logger.info("ifood.webhook.processed", { count: events.length })
    return NextResponse.json({ ok: true, processed: events.length })
  } catch (err) {
    logger.error("ifood.webhook.error", {
      error: err instanceof Error ? err.message : String(err),
    })
    // Return 500 so iFood retries rather than losing the event.
    return NextResponse.json({ error: "Processing error." }, { status: 500 })
  }
}
