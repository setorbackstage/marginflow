-- Prisma's schema language cannot express CHECK constraints (see the header
-- comment in prisma/schema.prisma, point 2). Every constraint below is
-- copied verbatim from the "Constraints" column of docs/DATA_MODEL.md.
-- Do not add a constraint here that is not documented there.

-- organizations
ALTER TABLE "organizations"
  ADD CONSTRAINT "organizations_type_check"
  CHECK ("type" IN ('FRANCHISE', 'RESTAURANT_GROUP', 'HOLDING_COMPANY'));

-- accounts
ALTER TABLE "accounts"
  ADD CONSTRAINT "accounts_plan_check"
  CHECK ("plan" IN ('FREE', 'STARTER', 'PRO', 'ENTERPRISE'));
ALTER TABLE "accounts"
  ADD CONSTRAINT "accounts_status_check"
  CHECK ("status" IN ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PAST_DUE'));

-- stores
ALTER TABLE "stores"
  ADD CONSTRAINT "stores_type_check"
  CHECK ("type" IN ('RESTAURANT', 'DARK_KITCHEN', 'CAFE', 'BAR', 'PIZZERIA', 'BURGER_SHOP', 'FRANCHISE_UNIT'));
ALTER TABLE "stores"
  ADD CONSTRAINT "stores_status_check"
  CHECK ("status" IN ('ACTIVE', 'INACTIVE', 'SUSPENDED'));
ALTER TABLE "stores"
  ADD CONSTRAINT "stores_currency_check"
  CHECK ("currency" IN ('BRL', 'USD', 'EUR'));
ALTER TABLE "stores"
  ADD CONSTRAINT "stores_minimum_order_value_check"
  CHECK ("minimum_order_value" >= 0);
ALTER TABLE "stores"
  ADD CONSTRAINT "stores_delivery_fee_check"
  CHECK ("delivery_fee" >= 0);

-- store_settings
ALTER TABLE "store_settings"
  ADD CONSTRAINT "store_settings_receipt_format_check"
  CHECK ("receipt_format" IN ('A4', 'THERMAL_80MM', 'THERMAL_58MM'));
ALTER TABLE "store_settings"
  ADD CONSTRAINT "store_settings_max_scheduled_days_ahead_check"
  CHECK ("max_scheduled_days_ahead" >= 1);

-- users
ALTER TABLE "users"
  ADD CONSTRAINT "users_status_check"
  CHECK ("status" IN ('ACTIVE', 'INACTIVE', 'INVITED'));

-- roles
ALTER TABLE "roles"
  ADD CONSTRAINT "roles_name_check"
  CHECK ("name" IN ('OWNER', 'MANAGER', 'CASHIER', 'KITCHEN_ATTENDANT', 'DELIVERY_COORDINATOR', 'ANALYST'));

-- memberships
ALTER TABLE "memberships"
  ADD CONSTRAINT "memberships_status_check"
  CHECK ("status" IN ('ACTIVE', 'INVITED', 'SUSPENDED', 'REVOKED'));

-- customers
ALTER TABLE "customers"
  ADD CONSTRAINT "customers_status_check"
  CHECK ("status" IN ('ACTIVE', 'BLOCKED'));
ALTER TABLE "customers"
  ADD CONSTRAINT "customers_total_orders_check"
  CHECK ("total_orders" >= 0);
ALTER TABLE "customers"
  ADD CONSTRAINT "customers_total_spent_check"
  CHECK ("total_spent" >= 0);

-- addresses
ALTER TABLE "addresses"
  ADD CONSTRAINT "addresses_label_check"
  CHECK ("label" IN ('HOME', 'WORK', 'OTHER'));
ALTER TABLE "addresses"
  ADD CONSTRAINT "addresses_state_length_check"
  CHECK (length("state") = 2);
ALTER TABLE "addresses"
  ADD CONSTRAINT "addresses_country_length_check"
  CHECK (length("country") = 2);

-- categories
ALTER TABLE "categories"
  ADD CONSTRAINT "categories_sort_order_check"
  CHECK ("sort_order" >= 0);

-- products
ALTER TABLE "products"
  ADD CONSTRAINT "products_price_check"
  CHECK ("price" >= 0);
ALTER TABLE "products"
  ADD CONSTRAINT "products_type_check"
  CHECK ("type" IN ('SIMPLE', 'COMBO', 'SERVICE_CHARGE'));
ALTER TABLE "products"
  ADD CONSTRAINT "products_status_check"
  CHECK ("status" IN ('ACTIVE', 'INACTIVE', 'OUT_OF_STOCK'));
ALTER TABLE "products"
  ADD CONSTRAINT "products_sort_order_check"
  CHECK ("sort_order" >= 0);

-- modifier_groups
ALTER TABLE "modifier_groups"
  ADD CONSTRAINT "modifier_groups_min_selections_check"
  CHECK ("min_selections" >= 0);
ALTER TABLE "modifier_groups"
  ADD CONSTRAINT "modifier_groups_max_selections_check"
  CHECK ("max_selections" >= 1);
-- Cross-column rule from DATA_MODEL.md ("Must be <= max_selections"), not
-- expressible in Prisma's schema language at all (single- or multi-column).
ALTER TABLE "modifier_groups"
  ADD CONSTRAINT "modifier_groups_min_le_max_selections_check"
  CHECK ("min_selections" <= "max_selections");
ALTER TABLE "modifier_groups"
  ADD CONSTRAINT "modifier_groups_sort_order_check"
  CHECK ("sort_order" >= 0);

-- modifiers
-- Note: price_adjustment intentionally has no CHECK — negative values are a
-- valid discount, per DATA_MODEL.md.
ALTER TABLE "modifiers"
  ADD CONSTRAINT "modifiers_sort_order_check"
  CHECK ("sort_order" >= 0);

-- menus
ALTER TABLE "menus"
  ADD CONSTRAINT "menus_status_check"
  CHECK ("status" IN ('ACTIVE', 'INACTIVE', 'SCHEDULED'));
ALTER TABLE "menus"
  ADD CONSTRAINT "menus_channel_check"
  CHECK ("channel" IN ('DELIVERY', 'IN_STORE', 'MARKETPLACE', 'KIOSK'));

-- menu_sections
ALTER TABLE "menu_sections"
  ADD CONSTRAINT "menu_sections_sort_order_check"
  CHECK ("sort_order" >= 0);

-- orders
ALTER TABLE "orders"
  ADD CONSTRAINT "orders_number_check"
  CHECK ("number" > 0);
ALTER TABLE "orders"
  ADD CONSTRAINT "orders_status_check"
  CHECK ("status" IN ('DRAFT', 'PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'));
ALTER TABLE "orders"
  ADD CONSTRAINT "orders_type_check"
  CHECK ("type" IN ('DELIVERY', 'TAKEAWAY', 'DINE_IN'));
ALTER TABLE "orders"
  ADD CONSTRAINT "orders_channel_check"
  CHECK ("channel" IN ('IN_STORE', 'PHONE', 'MARKETPLACE', 'WHATSAPP', 'KIOSK'));
ALTER TABLE "orders"
  ADD CONSTRAINT "orders_items_total_check"
  CHECK ("items_total" >= 0);
ALTER TABLE "orders"
  ADD CONSTRAINT "orders_discount_total_check"
  CHECK ("discount_total" >= 0);
ALTER TABLE "orders"
  ADD CONSTRAINT "orders_delivery_fee_check"
  CHECK ("delivery_fee" >= 0);
ALTER TABLE "orders"
  ADD CONSTRAINT "orders_grand_total_check"
  CHECK ("grand_total" >= 0);

-- order_items
ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_product_price_check"
  CHECK ("product_price" >= 0);
ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_quantity_check"
  CHECK ("quantity" > 0);
ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_unit_total_check"
  CHECK ("unit_total" >= 0);
ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_subtotal_check"
  CHECK ("subtotal" >= 0);
ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_status_check"
  CHECK ("status" IN ('PENDING', 'PREPARING', 'READY', 'CANCELLED'));

-- order_status_transitions
ALTER TABLE "order_status_transitions"
  ADD CONSTRAINT "order_status_transitions_status_check"
  CHECK ("status" IN ('DRAFT', 'PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'));

-- kitchen_tickets
ALTER TABLE "kitchen_tickets"
  ADD CONSTRAINT "kitchen_tickets_order_type_check"
  CHECK ("order_type" IN ('DELIVERY', 'TAKEAWAY', 'DINE_IN'));
ALTER TABLE "kitchen_tickets"
  ADD CONSTRAINT "kitchen_tickets_status_check"
  CHECK ("status" IN ('QUEUED', 'PREPARING', 'READY', 'CANCELLED'));

-- kitchen_items
ALTER TABLE "kitchen_items"
  ADD CONSTRAINT "kitchen_items_quantity_check"
  CHECK ("quantity" > 0);
ALTER TABLE "kitchen_items"
  ADD CONSTRAINT "kitchen_items_status_check"
  CHECK ("status" IN ('PENDING', 'PREPARING', 'READY', 'CANCELLED'));

-- payments
ALTER TABLE "payments"
  ADD CONSTRAINT "payments_amount_check"
  CHECK ("amount" > 0);
ALTER TABLE "payments"
  ADD CONSTRAINT "payments_refunded_amount_check"
  CHECK ("refunded_amount" >= 0);
ALTER TABLE "payments"
  ADD CONSTRAINT "payments_status_check"
  CHECK ("status" IN ('PENDING', 'AUTHORIZED', 'PAID', 'REFUNDED', 'PARTIALLY_REFUNDED', 'FAILED'));
ALTER TABLE "payments"
  ADD CONSTRAINT "payments_method_check"
  CHECK ("method" IN ('CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'PIX', 'VOUCHER', 'GIFT_CARD', 'ONLINE'));
ALTER TABLE "payments"
  ADD CONSTRAINT "payments_gateway_check"
  CHECK ("gateway" IN ('MANUAL', 'STRIPE', 'PAGARME', 'MERCADO_PAGO', 'IUGU', 'ASAAS'));

-- payment_attempts
ALTER TABLE "payment_attempts"
  ADD CONSTRAINT "payment_attempts_amount_check"
  CHECK ("amount" > 0);
ALTER TABLE "payment_attempts"
  ADD CONSTRAINT "payment_attempts_method_check"
  CHECK ("method" IN ('CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'PIX', 'VOUCHER', 'GIFT_CARD', 'ONLINE'));
ALTER TABLE "payment_attempts"
  ADD CONSTRAINT "payment_attempts_gateway_check"
  CHECK ("gateway" IN ('MANUAL', 'STRIPE', 'PAGARME', 'MERCADO_PAGO', 'IUGU', 'ASAAS'));
ALTER TABLE "payment_attempts"
  ADD CONSTRAINT "payment_attempts_status_check"
  CHECK ("status" IN ('PENDING', 'AUTHORIZED', 'CAPTURED', 'DECLINED', 'FAILED', 'CANCELLED'));

-- deliveries
ALTER TABLE "deliveries"
  ADD CONSTRAINT "deliveries_status_check"
  CHECK ("status" IN ('AWAITING_PICKUP', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'RETURNED'));
ALTER TABLE "deliveries"
  ADD CONSTRAINT "deliveries_courier_type_check"
  CHECK ("courier_type" IN ('INTERNAL', 'PLATFORM'));
ALTER TABLE "deliveries"
  ADD CONSTRAINT "deliveries_platform_check"
  CHECK ("platform" IN ('IFOOD', 'RAPPI', 'UBER_EATS', 'LOGGI', 'OTHER'));
ALTER TABLE "deliveries"
  ADD CONSTRAINT "deliveries_estimated_minutes_check"
  CHECK ("estimated_minutes" IS NULL OR "estimated_minutes" > 0);

-- invoices
ALTER TABLE "invoices"
  ADD CONSTRAINT "invoices_type_check"
  CHECK ("type" IN ('NFCE', 'NFE'));
ALTER TABLE "invoices"
  ADD CONSTRAINT "invoices_status_check"
  CHECK ("status" IN ('PENDING', 'ISSUED', 'CANCELLED'));
ALTER TABLE "invoices"
  ADD CONSTRAINT "invoices_access_key_length_check"
  CHECK ("access_key" IS NULL OR length("access_key") = 44);
