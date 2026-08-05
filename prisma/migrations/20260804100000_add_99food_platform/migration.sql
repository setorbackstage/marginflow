/*
  # Add 99FOOD to marketplace platform CHECK constraints

  Extends the allowed marketplace `platform` values to include '99FOOD'
  across MarketplaceAppConfig, MarketplaceIntegration and Delivery.
*/

-- MarketplaceAppConfig.platform
ALTER TABLE "MarketplaceAppConfig" DROP CONSTRAINT IF EXISTS "MarketplaceAppConfig_platform_check";
ALTER TABLE "MarketplaceAppConfig" ADD CONSTRAINT "MarketplaceAppConfig_platform_check"
  CHECK ("platform" IN ('IFOOD', 'RAPPI', 'UBER_EATS', 'LOGGI', 'OTHER', '99FOOD'));

-- MarketplaceIntegration.platform
ALTER TABLE "marketplace_integrations" DROP CONSTRAINT IF EXISTS "marketplace_integrations_platform_check";
ALTER TABLE "marketplace_integrations" ADD CONSTRAINT "marketplace_integrations_platform_check"
  CHECK ("platform" IN ('IFOOD', 'RAPPI', 'UBER_EATS', '99FOOD'));

-- Delivery.platform (carries the marketplace platform for platform-delivered orders)
ALTER TABLE "Delivery" DROP CONSTRAINT IF EXISTS "Delivery_platform_check";
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_platform_check"
  CHECK ("platform" IN ('IFOOD', 'RAPPI', 'UBER_EATS', '99FOOD'));
