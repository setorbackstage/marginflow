-- AlterTable
ALTER TABLE "store_settings" ADD COLUMN     "description" TEXT,
ADD COLUMN     "instagram_handle" TEXT,
ADD COLUMN     "menu_banner_url" TEXT,
ADD COLUMN     "primary_color" TEXT,
ADD COLUMN     "secondary_color" TEXT,
ADD COLUMN     "whatsapp_number" TEXT;

-- CHECK constraints (Prisma's schema language cannot express these — see
-- schema.prisma header, point 2 — added as raw SQL, same pattern as every
-- other migration in this project).
ALTER TABLE "store_settings" ADD CONSTRAINT "store_settings_primary_color_check"
  CHECK ("primary_color" IS NULL OR "primary_color" ~ '^#[0-9A-Fa-f]{6}$');
ALTER TABLE "store_settings" ADD CONSTRAINT "store_settings_secondary_color_check"
  CHECK ("secondary_color" IS NULL OR "secondary_color" ~ '^#[0-9A-Fa-f]{6}$');
