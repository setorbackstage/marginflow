-- Add external_id to orders for marketplace idempotency
ALTER TABLE "orders" ADD COLUMN "external_id" TEXT;
CREATE UNIQUE INDEX "orders_store_id_external_id_key" ON "orders"("store_id", "external_id");

-- Marketplace app-level config (OAuth token cache per platform)
CREATE TABLE "marketplace_app_configs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "platform" TEXT NOT NULL,
    "access_token" TEXT,
    "token_expires_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

    CONSTRAINT "marketplace_app_configs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "marketplace_app_configs_platform_key" ON "marketplace_app_configs"("platform");

-- Per-store marketplace integrations
CREATE TABLE "marketplace_integrations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "store_id" UUID NOT NULL,
    "platform" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "last_sync_at" TIMESTAMPTZ(6),
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

    CONSTRAINT "marketplace_integrations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "marketplace_integrations_store_id_platform_key" ON "marketplace_integrations"("store_id", "platform");
CREATE INDEX "marketplace_integrations_platform_status_idx" ON "marketplace_integrations"("platform", "status");

ALTER TABLE "marketplace_integrations" ADD CONSTRAINT "marketplace_integrations_store_id_fkey"
    FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
