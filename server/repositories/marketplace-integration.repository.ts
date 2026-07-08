import "server-only"
import type { DbClient } from "../db"
import type { MarketplaceIntegration, Prisma } from "../../generated/prisma/client"

export const marketplaceIntegrationRepository = {
  findManyByStore(db: DbClient, storeId: string): Promise<MarketplaceIntegration[]> {
    return db.marketplaceIntegration.findMany({ where: { storeId }, orderBy: { createdAt: "asc" } })
  },

  findByStorePlatform(db: DbClient, storeId: string, platform: string): Promise<MarketplaceIntegration | null> {
    return db.marketplaceIntegration.findUnique({ where: { storeId_platform: { storeId, platform } } })
  },

  /** Used by the webhook/cron handler to resolve which store owns this merchantId. */
  findByMerchantId(db: DbClient, platform: string, merchantId: string): Promise<MarketplaceIntegration | null> {
    return db.marketplaceIntegration.findFirst({ where: { platform, merchantId } })
  },

  /** All active integrations for a platform — used by the cron polling loop. */
  findActiveByPlatform(db: DbClient, platform: string): Promise<MarketplaceIntegration[]> {
    return db.marketplaceIntegration.findMany({ where: { platform, status: "ACTIVE" } })
  },

  create(db: DbClient, data: Prisma.MarketplaceIntegrationCreateInput): Promise<MarketplaceIntegration> {
    return db.marketplaceIntegration.create({ data })
  },

  update(
    db: DbClient,
    id: string,
    data: Prisma.MarketplaceIntegrationUpdateInput,
  ): Promise<MarketplaceIntegration> {
    return db.marketplaceIntegration.update({ where: { id }, data })
  },

  delete(db: DbClient, id: string): Promise<MarketplaceIntegration> {
    return db.marketplaceIntegration.delete({ where: { id } })
  },
}
