-- Ensure refunded_amount never exceeds the original payment amount.
-- The existing check (>= 0) only guards the lower bound.
ALTER TABLE "payments"
  ADD CONSTRAINT "payments_refunded_amount_le_amount_check"
  CHECK ("refunded_amount" <= "amount");
