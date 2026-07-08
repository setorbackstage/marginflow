import type { WeeklySchedule } from "@/types/common"

export interface PublicModifier {
  id: string
  name: string
  priceAdjustment: number
}

export interface PublicModifierGroup {
  id: string
  name: string
  description: string | null
  isRequired: boolean
  minSelections: number
  maxSelections: number
  modifiers: PublicModifier[]
}

export interface PublicProduct {
  id: string
  name: string
  description: string | null
  price: number
  imageUrl: string | null
  modifierGroups: PublicModifierGroup[]
}

export interface PublicMenuSection {
  categoryId: string
  categoryName: string
  categoryDescription: string | null
  categoryImageUrl: string | null
  products: PublicProduct[]
}

export interface PublicStoreAddress {
  street: string | null
  number: string | null
  complement: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
  postalCode: string | null
}

export interface PublicStore {
  slug: string
  name: string
  logoUrl: string | null
  phone: string
  timezone: string
  operatingHours: WeeklySchedule
  address: PublicStoreAddress
  primaryColor: string | null
  secondaryColor: string | null
  menuBannerUrl: string | null
  description: string | null
  instagramHandle: string | null
  whatsappNumber: string | null
}

export interface PublicStorefront {
  store: PublicStore
  sections: PublicMenuSection[]
}

export interface CartLineSelection {
  modifierGroupId: string
  modifierId: string
  name: string
  priceAdjustment: number
}

export interface CartLine {
  lineId: string
  productId: string
  productName: string
  unitPrice: number
  quantity: number
  selections: CartLineSelection[]
  notes: string | null
}
