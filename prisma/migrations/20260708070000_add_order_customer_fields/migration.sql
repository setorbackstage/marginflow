-- Denormalized customer info for marketplace/anonymous orders where no Customer FK exists.
-- Also adds CPF/CNPJ document field captured from iFood orders.
ALTER TABLE "orders"
  ADD COLUMN "customer_name"     TEXT,
  ADD COLUMN "customer_phone"    TEXT,
  ADD COLUMN "customer_document" TEXT;
