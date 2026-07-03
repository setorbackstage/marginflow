/**
 * All permissions in the system follow the pattern: domain:action
 *
 * A Role is assigned a set of Permissions.
 * Permission checks are always performed server-side.
 * The frontend uses permissions only for UI visibility — never as a security boundary.
 */
export enum Permission {
  // Orders
  OrdersView = "orders:view",
  OrdersCreate = "orders:create",
  OrdersEdit = "orders:edit",
  OrdersCancel = "orders:cancel",
  OrdersRefund = "orders:refund",

  // Kitchen
  KitchenView = "kitchen:view",
  KitchenUpdateStatus = "kitchen:update_status",

  // Delivery
  DeliveryView = "delivery:view",
  DeliveryAssignCourier = "delivery:assign_courier",
  DeliveryUpdateStatus = "delivery:update_status",

  // Products
  ProductsView = "products:view",
  ProductsCreate = "products:create",
  ProductsEdit = "products:edit",
  ProductsDelete = "products:delete",

  // Menu
  MenuView = "menu:view",
  MenuCreate = "menu:create",
  MenuEdit = "menu:edit",
  MenuPublish = "menu:publish",

  // Customers
  CustomersView = "customers:view",
  CustomersCreate = "customers:create",
  CustomersEdit = "customers:edit",
  CustomersBlock = "customers:block",

  // CRM
  CrmView = "crm:view",
  CrmManageCampaigns = "crm:manage_campaigns",
  CrmExport = "crm:export",

  // Finance
  FinanceView = "finance:view",
  FinanceExport = "finance:export",

  // Reports
  ReportsView = "reports:view",
  ReportsExport = "reports:export",

  // Settings
  SettingsView = "settings:view",
  SettingsEdit = "settings:edit",

  // Users
  UsersView = "users:view",
  UsersInvite = "users:invite",
  UsersEdit = "users:edit",
  UsersRemove = "users:remove",

  // Store
  StoreView = "store:view",
  StoreEdit = "store:edit",

  // Billing (Account level)
  BillingView = "billing:view",
  BillingManage = "billing:manage",
}
