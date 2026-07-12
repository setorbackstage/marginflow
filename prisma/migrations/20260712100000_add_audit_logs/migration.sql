-- CreateTable: audit_logs
-- Append-only corporate audit trail. Rows are never updated or deleted.

CREATE TABLE "audit_logs" (
    "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
    "store_id"    UUID         NOT NULL,
    "user_id"     UUID,
    "action"      TEXT         NOT NULL,
    "entity_type" TEXT         NOT NULL,
    "entity_id"   TEXT,
    "entity_ref"  TEXT,
    "meta"        JSONB,
    "created_at"  TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "audit_logs_store_id_created_at_idx"  ON "audit_logs" ("store_id", "created_at" DESC);
CREATE INDEX "audit_logs_store_id_entity_type_idx" ON "audit_logs" ("store_id", "entity_type");

-- ForeignKeys
ALTER TABLE "audit_logs"
    ADD CONSTRAINT "audit_logs_store_id_fkey"
        FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "audit_logs"
    ADD CONSTRAINT "audit_logs_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Enable Supabase Realtime (optional — audit is read-heavy, no need for live push)
-- ALTER PUBLICATION supabase_realtime ADD TABLE audit_logs;
