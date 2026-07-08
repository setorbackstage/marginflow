-- Stores the iFood catalog external item code for automatic availability sync.
ALTER TABLE "products" ADD COLUMN "ifood_external_code" TEXT;
