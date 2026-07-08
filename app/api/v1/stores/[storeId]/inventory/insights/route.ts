import "server-only"
import type { NextRequest } from "next/server"
import { prisma } from "@/server/db"
import { ingredientService, recipeService, authorizationService } from "@/server/services"
import { requireAuth, requireUuidParams } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok } from "@/server/lib/http"

interface RouteContext {
  params: Promise<{ storeId: string }>
}

/**
 * Sprint 3 "Alertas" — additional derived indicators beyond low-stock:
 * stale ingredients (no movement in 30 days) and consumption/cost leaders
 * over the trailing 30 days. All read-derived, no new tables, no change to
 * existing stock/cost calculations.
 */
async function handleGetInsights(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "inventory:view")

  const [stale, consumption, productsWithoutRecipe] = await Promise.all([
    ingredientService.listStale(prisma, storeId),
    ingredientService.listTopConsumption(prisma, storeId),
    recipeService.countProductsWithoutRecipe(prisma, storeId),
  ])

  return ok({ stale, topByQuantity: consumption.byQuantity, topByCost: consumption.byCost, productsWithoutRecipe })
}

export const GET = compose(withRequestContext, withErrorHandling)(handleGetInsights)
