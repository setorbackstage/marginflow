import "server-only"
import type { DbClient } from "../db"
import type { MarketplaceIntegration } from "../../generated/prisma/client"
import { marketplaceIntegrationRepository } from "../repositories"
import { BadRequestError, ConflictError, NotFoundError } from "../lib/errors"

export interface ConnectMarketplaceInput {
  platform: string
  merchantId: string
}

export const marketplaceIntegrationService = {
  listByStore(db: DbClient, storeId: string): Promise<MarketplaceIntegration[]> {
    return marketplaceIntegrationRepository.findManyByStore(db, storeId)
  },

  async connect(db: DbClient, storeId: string, input: ConnectMarketplaceInput): Promise<MarketplaceIntegration> {
    const SUPPORTED = ["IFOOD", "RAPPI", "UBER_EATS"]
    if (!SUPPORTED.includes(input.platform)) {
      throw new BadRequestError("UNSUPPORTED_PLATFORM", `Platform "${input.platform}" is not supported. Supported: ${SUPPORTED.join(", ")}.`)
    }

    const existing = await marketplaceIntegrationRepository.findByStorePlatform(db, storeId, input.platform)
    if (existing) {
      throw new ConflictError("INTEGRATION_EXISTS", `Store already has an active ${input.platform} integration. Disconnect it first.`)
    }

    return marketplaceIntegrationRepository.create(db, {
      store: { connect: { id: storeId } },
      platform: input.platform,
      merchantId: input.merchantId,
      status: "ACTIVE",
    })
  },

  async disconnect(db: DbClient, storeId: string, platform: string): Promise<void> {
    const integration = await marketplaceIntegrationRepository.findByStorePlatform(db, storeId, platform)
    if (!integration) {
      throw new NotFoundError("INTEGRATION_NOT_FOUND", `No ${platform} integration found for this store.`)
    }
    await marketplaceIntegrationRepository.delete(db, integration.id)
  },
}
