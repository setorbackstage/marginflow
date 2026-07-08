import "server-only"
import type { DbClient } from "../db"
import type { MarketplaceAppConfig } from "../../generated/prisma/client"

export const marketplaceAppConfigRepository = {
  findByPlatform(db: DbClient, platform: string): Promise<MarketplaceAppConfig | null> {
    return db.marketplaceAppConfig.findUnique({ where: { platform } })
  },

  upsert(
    db: DbClient,
    platform: string,
    data: { accessToken: string; tokenExpiresAt: Date },
  ): Promise<MarketplaceAppConfig> {
    return db.marketplaceAppConfig.upsert({
      where: { platform },
      create: { platform, ...data },
      update: data,
    })
  },
}
