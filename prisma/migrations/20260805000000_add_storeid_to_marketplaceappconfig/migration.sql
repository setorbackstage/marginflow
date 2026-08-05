/*
  # Add store_id to MarketplaceAppConfig (align with MarketplaceIntegration)

  The 99Food driver keys marketplace app configs by (storeId, platform), but the
  table only had a single @unique platform column. This adds store_id and a
  composite unique constraint so each store can hold its own platform token.
*/

-- Add store_id column
ALTER TABLE "marketplace_app_configs" ADD COLUMN "store_id" uuid;

-- Backfill: assign each existing row to the first store (single-tenant legacy data)
-- (no-op if table empty)
UPDATE "marketplace_app_configs" SET "store_id" = (
  SELECT s."id" FROM "stores" s LIMIT 1
) WHERE "store_id" IS NULL;

-- Drop the old single-column unique on platform
ALTER TABLE "marketplace_app_configs" DROP CONSTRAINT IF EXISTS "MarketplaceAppConfig_platform_key";

-- Add composite unique (storeId, platform) + FK + index
ALTER TABLE "marketplace_app_configs"
  ADD CONSTRAINT "marketplace_app_configs_store_id_fkey"
  FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE;

ALTER TABLE "marketplace_app_configs"
  ADD CONSTRAINT "MarketplaceAppConfig_store_id_platform_key"
  UNIQUE ("store_id", "platform");

CREATE INDEX IF NOT EXISTS "marketplace_app_configs_store_id_idx"
  ON "marketplace_app_configs"("store_id");
