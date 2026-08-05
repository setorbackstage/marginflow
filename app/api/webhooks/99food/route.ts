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
import { processNinetyNineFoodEvents } from "@/server/services"
import type { NinetyNineFoodWebhookEvent } from "@/server/integrations/ninetyNineFood"
import { logger } from "@/server/lib"
import { env } from "@/config/env"

// ---------------------------------------------------------------------------
// Verificação de segredo compartilhado — header x-99food-webhook-secret.
// Se NINETYNINEFOOD_WEBHOOK_SECRET não estiver configurado, a verificação é
// pulada para manter compatibilidade retroativa com ambientes de desenvolvimento.
// ---------------------------------------------------------------------------

function verifyWebhookSecret(req: NextRequest): boolean {
  if (!env.NINETYNINEFOOD_WEBHOOK_SECRET) return true
  const incoming = req.headers.get("x-99food-webhook-secret")
  return incoming === env.NINETYNINEFOOD_WEBHOOK_SECRET
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!verifyWebhookSecret(req)) {
    logger.warn("99food.webhook.unauthorized", {
      ip: req.headers.get("x-forwarded-for") ?? "unknown",
    })
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

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
