-- Add kitchen ticket auto-print toggle to store_settings
ALTER TABLE "store_settings" ADD COLUMN "print_kitchen_ticket_on_confirm" BOOLEAN NOT NULL DEFAULT false;
