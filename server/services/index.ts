// Composition root — importing every service registers its event-bus
// subscriptions (see each service's `eventBus.on(...)` calls at module
// scope). Controllers must import services from here (not from an
// individual `*.service` file) so the full event graph is always wired up.
export { userService } from "./user.service"

export { storeService } from "./store.service"
export type { UpdateStoreInput, UpdateStoreSettingsInput } from "./store.service"

export { loginService } from "./login.service"
export type { LoginMembershipContext, LoginResult } from "./login.service"

export { signupService } from "./signup.service"
export type { SignupServiceInput } from "./signup.service"

export { refreshTokenService } from "./refresh-token.service"
export type { RefreshResult } from "./refresh-token.service"

export { logoutService } from "./logout.service"

export { meService } from "./me.service"
export type { MeProfile, MeMembershipContext } from "./me.service"

export { roleService } from "./role.service"
export type { RoleWithMemberCount } from "./role.service"

export { authorizationService } from "./authorization.service"

export { membershipService } from "./membership.service"
export type { TeamMember, InviteMemberInput } from "./membership.service"

export { customerService } from "./customer.service"
export type { CreateCustomerInput, UpdateCustomerInput } from "./customer.service"

export { addressService } from "./address.service"
export type { CreateAddressInput, UpdateAddressInput } from "./address.service"

export { categoryService } from "./category.service"
export type { CreateCategoryInput, UpdateCategoryInput } from "./category.service"

export { productService } from "./product.service"
export type { CreateProductInput, UpdateProductInput } from "./product.service"

export { modifierGroupService } from "./modifier-group.service"
export type { CreateModifierGroupInput, UpdateModifierGroupInput } from "./modifier-group.service"

export { modifierService } from "./modifier.service"
export type { CreateModifierInput, UpdateModifierInput } from "./modifier.service"

export { menuService } from "./menu.service"
export type { CreateMenuInput, UpdateMenuInput, MenuSectionInput } from "./menu.service"

export { orderService } from "./order.service"
export type {
  CreateOrderInput,
  CreateOrderItemInput,
  SelectedModifierInput,
  UpdateOrderInput,
  UpdateOrderItemInput,
  UpdateOrderStatusOptions,
} from "./order.service"

export { kitchenService } from "./kitchen.service"

export { deliveryService } from "./delivery.service"
export type { AssignCourierInput } from "./delivery.service"

export { paymentService } from "./payment.service"
export type { InitiatePaymentInput, RefundPaymentInput } from "./payment.service"

export { ingredientService } from "./ingredient.service"
export type { CreateIngredientInput, UpdateIngredientInput, LowStockAlert, StaleIngredient, ConsumptionInsight } from "./ingredient.service"

export { recipeService } from "./recipe.service"
export type { UpsertRecipeInput, RecipeItemInput, RecipeWithCosts } from "./recipe.service"

export { stockMovementService } from "./stock-movement.service"
export type { CreateManualMovementInput, ManualMovementType } from "./stock-movement.service"

export { publicMenuService, toPublicStorefrontDTO } from "./public-menu.service"
export type { PublicStorefront } from "./public-menu.service"

export { marketplaceIntegrationService } from "./marketplace-integration.service"
export type { ConnectMarketplaceInput } from "./marketplace-integration.service"

export { ifoodSyncService, pollAllIfoodStores, processIfoodEvents } from "./ifood-sync.service"

export { passwordAuthService } from "./password-auth.service"
