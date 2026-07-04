-- DATA_MODEL.md and DOMAIN_MODEL.md have always documented `city` as a
-- required attribute of Address, but the column was missing from this
-- schema — a pure implementation gap, not a documentation conflict. Added
-- in three steps so this applies safely even if the table already has rows:
-- add nullable, backfill existing rows, then enforce NOT NULL to match
-- DATA_MODEL.md exactly. Backfilled rows get an empty string as a
-- placeholder — a real data-quality follow-up for whoever operates the
-- store to fill in the actual city, not a schema concern.
ALTER TABLE "addresses" ADD COLUMN "city" TEXT;
UPDATE "addresses" SET "city" = '' WHERE "city" IS NULL;
ALTER TABLE "addresses" ALTER COLUMN "city" SET NOT NULL;
