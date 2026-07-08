/**
 * POST /api/webhooks/ifood
 *
 * Public endpoint that receives iFood marketplace events (PLACED, CONFIRMED, etc.).
 * iFood requires a 202 Accepted response within 5 seconds.
 *
 * Security: iFood sends events only from known IPs. For additional protection,
 * set IFOOD_WEBHOOK_SECRET in env vars; iFood will include it as a query param
 * `?secret=<value>` when registering the webhook URL in the Developer Portal.
 */
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { processIfoodEvents } from "@/server/services"
import { logger } from "@/server/lib"
import type { IfoodEvent } from "@/server/integrations/ifood"

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Optional shared secret validation
  const secret = process.env.IFOOD_WEBHOOK_SECRET
  if (secret) {
    const provided = req.nextUrl.searchParams.get("secret")
    if (provided !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  let events: IfoodEvent[]
  try {
    const body = await req.json()
    // iFood sends either a single event object or an array
    events = Array.isArray(body) ? body : [body]
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  logger.info("ifood.webhook.received", { count: events.length })

  // Process asynchronously — we must return 202 within 5 seconds
  // For serverless, we process inline but keep it fast (only one DB write for PLACED events)
  processIfoodEvents(events).catch((err) => {
    logger.error("ifood.webhook.process_error", { error: err instanceof Error ? err.message : String(err) })
  })

  return new NextResponse(null, { status: 202 })
}
