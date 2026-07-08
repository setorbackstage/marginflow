-- Add delivered_by to orders to track which party handles delivery for marketplace orders
ALTER TABLE "orders" ADD COLUMN "delivered_by" TEXT;
