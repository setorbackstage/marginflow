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
import { processIfoodEvents } from "@/server/services"
import type { IfoodEvent } from "@/server/integrations/ifood"
import { logger } from "@/server/lib"
import { env } from "@/config/env"

// ---------------------------------------------------------------------------
// Verificação de segredo compartilhado — header x-ifood-webhook-secret.
// Se IFOOD_WEBHOOK_SECRET não estiver configurado, a verificação é pulada
// para manter compatibilidade retroativa com ambientes de desenvolvimento.
// ---------------------------------------------------------------------------

function verifyWebhookSecret(req: NextRequest): boolean {
  if (!env.IFOOD_WEBHOOK_SECRET) return true
  const incoming = req.headers.get("x-ifood-webhook-secret")
  return incoming === env.IFOOD_WEBHOOK_SECRET
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!verifyWebhookSecret(req)) {
    logger.warn("ifood.webhook.unauthorized", { ip: req.headers.get("x-forwarded-for") ?? "unknown" })
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

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
    logger.error("ifood.webhook.error", { error: err instanceof Error ? err.message : String(err) })
    // Return 500 so iFood retries rather than losing the event.
    return NextResponse.json({ error: "Processing error." }, { status: 500 })
  }
}
