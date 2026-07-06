-- Data migration: existing roles were provisioned before the Inventory
-- module's permissions existed. API_SPEC.md's RBAC section maps them to the
-- built-in roles as follows: OWNER and MANAGER hold all three;
-- KITCHEN_ATTENDANT and ANALYST hold inventory:view; CASHIER and
-- DELIVERY_COORDINATOR hold none. New stores get the full catalog from
-- signup.service.ts — this backfills stores created before the module.
-- Idempotent: the @> guard skips roles that already have the permission.

UPDATE "roles"
SET "permissions" = "permissions" || ARRAY['inventory:view', 'inventory:manage', 'inventory:adjust']
WHERE "name" IN ('OWNER', 'MANAGER')
  AND NOT ("permissions" @> ARRAY['inventory:view']);

UPDATE "roles"
SET "permissions" = "permissions" || ARRAY['inventory:view']
WHERE "name" IN ('KITCHEN_ATTENDANT', 'ANALYST')
  AND NOT ("permissions" @> ARRAY['inventory:view']);
