/**
 * POST /api/webhooks/99food
 *
 * Receives push events from the 99Food open API webhook.
 * 99Food sends events such as orderNew / orderFinish / orderCancel.
 *
 * The endpoint MUST return 200 quickly — 99Food retries delivery on failures.
 * We process events synchronously here; any failure returns 500 so the
 * platform retries rather than losing the event.
 *
 * Register https://<your-domain>/api/webhooks/99food in the 99Food
 * partner portal to receive push events.
 */
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { timingSafeEqual, createHash } from "node:crypto"
import { processNinetyNineFoodEvents } from "@/server/services"
import type { NinetyNineFoodWebhookEvent } from "@/server/integrations/ninetyNineFood"
import { logger, logAudit } from "@/server/lib"
import { prisma } from "@/server/db"
import { env } from "@/config/env"

// ---------------------------------------------------------------------------
// Verificação de segredo compartilhado — header x-99food-webhook-secret.
//
// SECURITY (VULN-001): a verificação NUNCA é pulada. Se a secret não está
// configurada no servidor, o endpoint responde 503 (app não pronto) em vez
// de aceitar eventos não autenticados. A comparação usa timingSafeEqual
// sobre hashes de tamanho fixo para evitar timing attacks.
// ---------------------------------------------------------------------------

function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex")
}

function verifyWebhookSecret(req: NextRequest): { ok: boolean; configured: boolean } {
  const expected = env.NINETYNINEFOOD_WEBHOOK_SECRET
  // Secret obrigatória: sem ela, o app não está pronto para receber webhooks.
  if (!expected) {
    return { ok: false, configured: false }
  }
  const incoming = req.headers.get("x-99food-webhook-secret")
  if (!incoming) {
    return { ok: false, configured: true }
  }
  // Compara hashes SHA-256 (tamanho fixo) com timingSafeEqual.
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
      // Secret ausente no servidor: app não pronto. Nunca aceita eventos.
      logger.error("99food.webhook.secret_not_configured", { ip })
      void logAudit(prisma, {
        storeId: "system",
        userId: "system",
        action: "webhook.rejected",
        entityType: "Webhook",
        entityId: "99food",
        entityRef: "secret_not_configured",
      })
      return NextResponse.json(
        { error: "Webhook authentication is not configured on the server." },
        { status: 503 },
      )
    }
    logger.warn("99food.webhook.unauthorized", { ip })
    void logAudit(prisma, {
      storeId: "system",
      userId: "system",
      action: "webhook.rejected",
      entityType: "Webhook",
      entityId: "99food",
      entityRef: "invalid_secret",
    })
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  // Audit: webhook recebido e autenticado.
  void logAudit(prisma, {
    storeId: "system",
    userId: "system",
    action: "webhook.received",
    entityType: "Webhook",
    entityId: "99food",
    entityRef: "authenticated",
  })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  // 99Food may send a single object or an array; normalise to array.
  const events: NinetyNineFoodWebhookEvent[] = Array.isArray(body)
    ? (body as NinetyNineFoodWebhookEvent[])
    : [body as NinetyNineFoodWebhookEvent]

  if (events.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 })
  }

  try {
    await processNinetyNineFoodEvents(events)
    logger.info("99food.webhook.processed", { count: events.length })
    return NextResponse.json({ ok: true, processed: events.length })
  } catch (err) {
    logger.error("99food.webhook.error", {
      error: err instanceof Error ? err.message : String(err),
    })
    // Return 500 so 99Food retries rather than losing the event.
    return NextResponse.json({ error: "Processing error." }, { status: 500 })
  }
}
