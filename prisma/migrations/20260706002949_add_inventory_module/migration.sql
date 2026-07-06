-- CreateTable
CREATE TABLE "ingredients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "store_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "current_stock" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "min_stock" DECIMAL(14,3),
    "cost_per_unit" DECIMAL(14,6) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "store_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "yield_quantity" DECIMAL(10,3) NOT NULL DEFAULT 1,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "recipe_id" UUID NOT NULL,
    "ingredient_id" UUID NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "waste_pct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "recipe_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "store_id" UUID NOT NULL,
    "ingredient_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "quantity_delta" DECIMAL(14,3) NOT NULL,
    "unit_cost" DECIMAL(14,6) NOT NULL,
    "order_id" UUID,
    "reason" TEXT,
    "created_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ingredients_store_id_status_idx" ON "ingredients"("store_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "recipes_product_id_key" ON "recipes"("product_id");

-- CreateIndex
CREATE INDEX "recipes_store_id_idx" ON "recipes"("store_id");

-- CreateIndex
CREATE INDEX "recipe_items_ingredient_id_idx" ON "recipe_items"("ingredient_id");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_items_recipe_id_ingredient_id_key" ON "recipe_items"("recipe_id", "ingredient_id");

-- CreateIndex
CREATE INDEX "stock_movements_store_id_ingredient_id_created_at_idx" ON "stock_movements"("store_id", "ingredient_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "stock_movements_store_id_created_at_idx" ON "stock_movements"("store_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "stock_movements_store_id_type_created_at_idx" ON "stock_movements"("store_id", "type", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "stock_movements_order_id_ingredient_id_type_key" ON "stock_movements"("order_id", "ingredient_id", "type");

-- AddForeignKey
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_items" ADD CONSTRAINT "recipe_items_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_items" ADD CONSTRAINT "recipe_items_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────
-- CHECK constraints and partial indexes documented in DATA_MODEL.md.
-- Prisma's schema language cannot express these (see schema.prisma header,
-- points 2 and 3) — added as raw SQL, same pattern as the
-- add_check_constraints migration.
-- ─────────────────────────────────────────────────────────────────────────

-- ingredients
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_unit_check"
  CHECK ("unit" IN ('G', 'ML', 'UN'));
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_status_check"
  CHECK ("status" IN ('ACTIVE', 'INACTIVE'));
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_min_stock_check"
  CHECK ("min_stock" IS NULL OR "min_stock" >= 0);
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_cost_per_unit_check"
  CHECK ("cost_per_unit" >= 0);

-- UNIQUE (store_id, name) WHERE deleted_at IS NULL — partial so a
-- soft-deleted ingredient's name can be reused.
CREATE UNIQUE INDEX "ingredients_store_id_name_key"
  ON "ingredients"("store_id", "name") WHERE "deleted_at" IS NULL;

-- Low-stock alert scan: only rows with an alert threshold configured.
CREATE INDEX "ingredients_store_id_low_stock_idx"
  ON "ingredients"("store_id") WHERE "min_stock" IS NOT NULL;

-- recipes
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_yield_quantity_check"
  CHECK ("yield_quantity" > 0);

-- recipe_items
ALTER TABLE "recipe_items" ADD CONSTRAINT "recipe_items_quantity_check"
  CHECK ("quantity" > 0);
ALTER TABLE "recipe_items" ADD CONSTRAINT "recipe_items_waste_pct_check"
  CHECK ("waste_pct" >= 0 AND "waste_pct" <= 100);

-- stock_movements
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_type_check"
  CHECK ("type" IN ('ENTRY', 'EXIT', 'ADJUSTMENT', 'LOSS', 'SALE_CONSUMPTION', 'SALE_REVERSAL'));
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_quantity_delta_nonzero_check"
  CHECK ("quantity_delta" <> 0);
-- Sign-per-type (Business Rule / DATA_MODEL.md): positive for inflows,
-- negative for outflows, either sign for ADJUSTMENT.
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_quantity_delta_sign_check"
  CHECK (
    ("type" IN ('ENTRY', 'SALE_REVERSAL') AND "quantity_delta" > 0)
    OR ("type" IN ('EXIT', 'LOSS', 'SALE_CONSUMPTION') AND "quantity_delta" < 0)
    OR ("type" = 'ADJUSTMENT')
  );
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_unit_cost_check"
  CHECK ("unit_cost" >= 0);
-- order_id is mandatory for automatic movements and forbidden for manual ones.
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_order_id_by_type_check"
  CHECK (
    ("type" IN ('SALE_CONSUMPTION', 'SALE_REVERSAL') AND "order_id" IS NOT NULL)
    OR ("type" NOT IN ('SALE_CONSUMPTION', 'SALE_REVERSAL') AND "order_id" IS NULL)
  );
-- reason is mandatory for corrections and losses.
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_reason_check"
  CHECK ("type" NOT IN ('ADJUSTMENT', 'LOSS') OR "reason" IS NOT NULL);
