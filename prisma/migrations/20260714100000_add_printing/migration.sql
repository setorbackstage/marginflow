-- CreateTable printers
CREATE TABLE "printers" (
    "id"         UUID    NOT NULL DEFAULT gen_random_uuid(),
    "store_id"   UUID    NOT NULL,
    "name"       TEXT    NOT NULL,
    "type"       TEXT    NOT NULL DEFAULT 'GENERAL',
    "model"      TEXT,
    "interface"  TEXT    NOT NULL DEFAULT 'NETWORK',
    "address"    TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active"  BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "printers_pkey" PRIMARY KEY ("id")
);

-- CreateTable print_templates
CREATE TABLE "print_templates" (
    "id"         UUID    NOT NULL DEFAULT gen_random_uuid(),
    "store_id"   UUID    NOT NULL,
    "name"       TEXT    NOT NULL,
    "type"       TEXT    NOT NULL,
    "layout"     JSONB   NOT NULL DEFAULT '{}',
    "is_active"  BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "print_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable print_rules
CREATE TABLE "print_rules" (
    "id"          UUID    NOT NULL DEFAULT gen_random_uuid(),
    "store_id"    UUID    NOT NULL,
    "printer_id"  UUID    NOT NULL,
    "template_id" UUID    NOT NULL,
    "event"       TEXT    NOT NULL,
    "sector"      TEXT,
    "is_active"   BOOLEAN NOT NULL DEFAULT true,
    "sort_order"  INTEGER NOT NULL DEFAULT 0,
    "created_at"  TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at"  TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "print_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable print_jobs
CREATE TABLE "print_jobs" (
    "id"          UUID    NOT NULL DEFAULT gen_random_uuid(),
    "store_id"    UUID    NOT NULL,
    "printer_id"  UUID    NOT NULL,
    "template_id" UUID,
    "order_id"    UUID,
    "type"        TEXT    NOT NULL,
    "content"     TEXT,
    "status"      TEXT    NOT NULL DEFAULT 'PENDING',
    "attempts"    INTEGER NOT NULL DEFAULT 0,
    "error"       TEXT,
    "created_at"  TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "printed_at"  TIMESTAMPTZ(6),

    CONSTRAINT "print_jobs_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "printers_store_id_idx" ON "printers"("store_id");
CREATE INDEX "print_templates_store_id_type_idx" ON "print_templates"("store_id", "type");
CREATE INDEX "print_rules_store_id_event_idx" ON "print_rules"("store_id", "event");
CREATE INDEX "print_jobs_store_id_created_at_idx" ON "print_jobs"("store_id", "created_at" DESC);
CREATE INDEX "print_jobs_store_id_status_idx" ON "print_jobs"("store_id", "status");
CREATE INDEX "print_jobs_printer_id_status_idx" ON "print_jobs"("printer_id", "status");

-- CHECK constraints
ALTER TABLE "printers"
  ADD CONSTRAINT "printers_type_check"
  CHECK (type IN ('KITCHEN','BAR','CONFECTIONERY','CASHIER','FISCAL','DELIVERY','EXPEDITION','GENERAL'));

ALTER TABLE "printers"
  ADD CONSTRAINT "printers_interface_check"
  CHECK (interface IN ('USB','NETWORK','BLUETOOTH','SERIAL','VIRTUAL'));

ALTER TABLE "print_templates"
  ADD CONSTRAINT "print_templates_type_check"
  CHECK (type IN ('ORDER','RECEIPT','CANCELLATION','LABEL','KITCHEN','DELIVERY','TEST'));

ALTER TABLE "print_jobs"
  ADD CONSTRAINT "print_jobs_type_check"
  CHECK (type IN ('ORDER','RECEIPT','CANCELLATION','LABEL','KITCHEN','DELIVERY','TEST'));

ALTER TABLE "print_jobs"
  ADD CONSTRAINT "print_jobs_status_check"
  CHECK (status IN ('PENDING','SENDING','PRINTED','ERROR','CANCELLED'));

-- Foreign Keys
ALTER TABLE "printers"
  ADD CONSTRAINT "printers_store_id_fkey"
  FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "print_templates"
  ADD CONSTRAINT "print_templates_store_id_fkey"
  FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "print_rules"
  ADD CONSTRAINT "print_rules_store_id_fkey"
  FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "print_rules"
  ADD CONSTRAINT "print_rules_printer_id_fkey"
  FOREIGN KEY ("printer_id") REFERENCES "printers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "print_rules"
  ADD CONSTRAINT "print_rules_template_id_fkey"
  FOREIGN KEY ("template_id") REFERENCES "print_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "print_jobs"
  ADD CONSTRAINT "print_jobs_store_id_fkey"
  FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "print_jobs"
  ADD CONSTRAINT "print_jobs_printer_id_fkey"
  FOREIGN KEY ("printer_id") REFERENCES "printers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "print_jobs"
  ADD CONSTRAINT "print_jobs_template_id_fkey"
  FOREIGN KEY ("template_id") REFERENCES "print_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
