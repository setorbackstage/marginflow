/**
 * GET /api/cron/ifood-poll
 *
 * Vercel Cron Job — polls iFood for new events across all active store integrations.
 * Runs every minute as a fallback for webhooks that may have been missed or
 * delayed. Protected by the CRON_SECRET env var (Vercel sets this automatically
 * for cron routes when vercel.json configures them).
 *
 * See vercel.json for the schedule configuration.
 */
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { pollAllIfoodStores } from "@/server/services"
import { logger } from "@/server/lib"

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authHeader = req.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await pollAllIfoodStores()
    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error("ifood.cron.error", { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
