import "server-only"
import type { DbClient } from "../db"
import type { Prisma, StockMovement } from "../../generated/prisma/client"
import type { PaginationParams } from "./pagination"

export type StockMovementWithRelations = Prisma.StockMovementGetPayload<{
  include: { ingredient: true; order: true; createdByUser: true }
}>

/**
 * Pure data access for the `stock_movements` ledger. Append-only by design
 * (Business Rule 37) — no update or delete methods exist on purpose.
 */
export const stockMovementRepository = {
  findManyByStore(
    db: DbClient,
    storeId: string,
    params: PaginationParams & {
      where?: Prisma.StockMovementWhereInput
      orderBy?: Prisma.StockMovementOrderByWithRelationInput
    } = {},
  ): Promise<StockMovementWithRelations[]> {
    return db.stockMovement.findMany({
      where: { storeId, ...params.where },
      include: { ingredient: true, order: true, createdByUser: true },
      orderBy: params.orderBy ?? { createdAt: "desc" },
      skip: params.skip,
      take: params.take,
    })
  },

  count(db: DbClient, storeId: string, where: Prisma.StockMovementWhereInput = {}): Promise<number> {
    return db.stockMovement.count({ where: { storeId, ...where } })
  },

  findManyByOrder(db: DbClient, orderId: string, type?: string): Promise<StockMovement[]> {
    return db.stockMovement.findMany({ where: { orderId, ...(type ? { type } : {}) } })
  },

  create(db: DbClient, data: Prisma.StockMovementCreateInput): Promise<StockMovement> {
    return db.stockMovement.create({ data })
  },

  /**
   * CMV aggregation (Business Rule 45): Σ(|quantity_delta| × unit_cost) of
   * SALE_CONSUMPTION minus SALE_REVERSAL in [from, to). Reads the snapshots
   * recorded on each movement, never current ingredient costs. Returns
   * integer cents (rounded).
   */
  async sumCmv(db: DbClient, storeId: string, from: Date, to: Date): Promise<number> {
    const rows = await db.stockMovement.findMany({
      where: {
        storeId,
        type: { in: ["SALE_CONSUMPTION", "SALE_REVERSAL"] },
        createdAt: { gte: from, lt: to },
      },
      select: { type: true, quantityDelta: true, unitCost: true },
    })
    const total = rows.reduce((sum, row) => {
      const cost = Math.abs(Number(row.quantityDelta)) * Number(row.unitCost)
      return row.type === "SALE_CONSUMPTION" ? sum + cost : sum - cost
    }, 0)
    return Math.round(total)
  },

  /**
   * Sprint 3 "Alertas" (Maior consumo / Maior custo): raw SALE_CONSUMPTION
   * rows in [from, to) for JS-side aggregation per ingredient — same
   * snapshot-reading approach as `sumCmv`, just not pre-summed since the
   * caller needs a per-ingredient breakdown, not a single total.
   */
  findConsumptionByIngredient(db: DbClient, storeId: string, from: Date, to: Date) {
    return db.stockMovement.findMany({
      where: { storeId, type: "SALE_CONSUMPTION", createdAt: { gte: from, lt: to } },
      select: { ingredientId: true, quantityDelta: true, unitCost: true },
    })
  },

  /** Sprint 3 "Alertas" (Produto parado): last movement timestamp per ingredient, one grouped query instead of N. */
  maxCreatedAtByIngredient(db: DbClient, storeId: string) {
    return db.stockMovement.groupBy({
      by: ["ingredientId"],
      where: { storeId },
      _max: { createdAt: true },
    })
  },
}
