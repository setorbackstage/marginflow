-- Enable pg_trgm for fast ILIKE / trigram searches
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN index on orders.customer_name for fast ILIKE search
-- Without this, "WHERE customer_name ILIKE '%text%'" does a full table scan.
CREATE INDEX IF NOT EXISTS "orders_customer_name_trgm_idx"
  ON "orders" USING GIN ("customer_name" gin_trgm_ops);

-- Composite index for common filtered queries (store + status + channel)
CREATE INDEX IF NOT EXISTS "orders_store_status_channel_idx"
  ON "orders" ("store_id", "status", "channel");
