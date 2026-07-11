export type ChecklistItemId =
  | "store_created"
  | "logo_added"
  | "categories_created"
  | "products_created"
  | "ingredients_created"
  | "recipe_created"
  | "customer_created"
  | "order_created"
  | "payment_configured"
  | "onboarding_complete"

export interface OnboardingSettings {
  welcomeDismissed?: boolean
  completedAt?: string | null
  recipeCreated?: boolean
}

export interface ChecklistItem {
  id: ChecklistItemId
  label: string
  description: string
  href: string
  completed: boolean
  isLoading: boolean
}

export interface TourStep {
  selector: string
  title: string
  content: string
  placement?: "top" | "bottom" | "left" | "right"
}
