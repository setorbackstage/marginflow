import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createHash, timingSafeEqual } from "node:crypto"
import { processOpenDeliveryEvents } from "@/server/integrations/opendelivery"
import type { OdOrderEvent } from "@/server/integrations/opendelivery"
import { logger } from "@/server/lib"

// ─────────────────────────────────────────────────────────────────────────
// POST /api/od/v2/orderEvent
//
// Open Delivery v2 webhook receiver (Ordering Application → Software Service push).
// Verifies HMAC-SHA256 when OD_WEBHOOK_SECRET is set. Accepts a single event or
// an array. Mirrors the iFood webhook pattern already in the codebase.
// ─────────────────────────────────────────────────────────────────────────

function verifySignature(secret: string, rawBody: string, signature: string | null): boolean {
  if (!signature) return false
  const expected = createHash("sha256").update(rawBody).update(secret).digest("hex")
  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.OD_WEBHOOK_SECRET
  const rawBody = await req.text()

  if (secret) {
    const signature = req.headers.get("x-app-signature")
    if (!verifySignature(secret, rawBody, signature)) {
      logger.warn("opendelivery.webhook.invalid_signature")
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }
  }

  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const events: OdOrderEvent[] = Array.isArray(payload) ? payload : [payload as OdOrderEvent]
  if (events.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 })
  }

  try {
    await processOpenDeliveryEvents(events)
    logger.info("opendelivery.webhook.processed", { count: events.length })
    return NextResponse.json({ ok: true, processed: events.length })
  } catch (err) {
    logger.error("opendelivery.webhook.error", {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
