import "server-only"
import type { NextRequest } from "next/server"
import { prisma } from "@/server/db"
import { authorizationService } from "@/server/services"
import { requireAuth, requireUuidParams } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok } from "@/server/lib/http"

interface RouteContext {
  params: Promise<{ storeId: string }>
}

/** CRM segment counts for a store. All computed from the `customers` table in a single round-trip. */
async function handleGetSegments(_request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId } = requireUuidParams(await params)
  const actor = requireAuth(_request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "customers:view")

  const now = new Date()
  const days30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const days60 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

  const [total, active, blocked, newLast30, frequent, atRisk, churned] = await Promise.all([
    prisma.customer.count({ where: { storeId } }),
    prisma.customer.count({ where: { storeId, status: "ACTIVE" } }),
    prisma.customer.count({ where: { storeId, status: "BLOCKED" } }),
    // "Novos" — first order within last 30 days (or created within 30d with no orders yet)
    prisma.customer.count({
      where: { storeId, OR: [{ firstOrderAt: { gte: days30 } }, { firstOrderAt: null, createdAt: { gte: days30 } }] },
    }),
    // "Frequentes" — 5+ orders
    prisma.customer.count({ where: { storeId, totalOrders: { gte: 5 } } }),
    // "Em risco" — ordered before but silent for >30 days
    prisma.customer.count({ where: { storeId, lastOrderAt: { not: null, lt: days30 }, totalOrders: { gte: 2 } } }),
    // "Perdidos" — no order in 60+ days
    prisma.customer.count({ where: { storeId, lastOrderAt: { not: null, lt: days60 } } }),
  ])

  return ok({ total, active, blocked, newLast30, frequent, atRisk, churned })
}

export const GET = compose(withRequestContext, withErrorHandling)(handleGetSegments)
