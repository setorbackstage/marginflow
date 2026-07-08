import "server-only"
import type { DbClient } from "../db"
import type { Store, StoreSettings } from "../../generated/prisma/client"
import { storeRepository } from "../repositories/store.repository"
import { storeSettingsRepository } from "../repositories/store-settings.repository"
import { menuRepository } from "../repositories/menu.repository"
import { productRepository } from "../repositories/product.repository"

export interface PublicStorefront {
  store: Store
  settings: StoreSettings | null
  sections: {
    categoryId: string
    categoryName: string
    categoryDescription: string | null
    categoryImageUrl: string | null
    products: Awaited<
      ReturnType<typeof productRepository.findManyPublicByStore>
    >
  }[]
}

/**
 * Read-only composition for the public, unauthenticated storefront
 * (Sprint 2 "Canal Próprio") — a Store's own branded menu page. Reuses
 * Menu/Category/Product/ModifierGroup exactly as the authenticated app
 * does; adds no new tables or business rules, only a public-safe read path.
 */
export const publicMenuService = {
  /**
   * Returns `null` when the slug doesn't resolve to an active Store, or the
   * Store has no published (`ACTIVE`) Menu yet — both cases the route maps
   * to a 404, never leaking which one it was.
   */
  async getStorefront(
    db: DbClient,
    slug: string,
  ): Promise<PublicStorefront | null> {
    const store = await storeRepository.findBySlug(db, slug)
    if (!store || store.status !== "ACTIVE") return null

    const menu = await menuRepository.findFirstActiveByStore(db, store.id)
    if (!menu) return null

    const [settings, products] = await Promise.all([
      storeSettingsRepository.findByStoreId(db, store.id),
      productRepository.findManyPublicByStore(db, store.id),
    ])

    const productsByCategory = new Map<string, typeof products>()
    for (const product of products) {
      const list = productsByCategory.get(product.categoryId) ?? []
      list.push(product)
      productsByCategory.set(product.categoryId, list)
    }

    const sections = menu.sections
      .filter(
        (section) => section.category.isActive && !section.category.deletedAt,
      )
      .map((section) => ({
        categoryId: section.category.id,
        categoryName: section.category.name,
        categoryDescription: section.category.description,
        categoryImageUrl: section.category.imageUrl,
        products: productsByCategory.get(section.category.id) ?? [],
      }))

    return { store, settings, sections }
  },
}

/**
 * Maps the internal Prisma-shaped `PublicStorefront` to the exact public DTO
 * — shared by the public API route and the `/r/[slug]` page's server
 * component (SSR), so the two never drift out of sync on what's exposed.
 */
export function toPublicStorefrontDTO(storefront: PublicStorefront) {
  const { store, settings, sections } = storefront
  return {
    store: {
      slug: store.slug,
      name: store.name,
      logoUrl: store.logoUrl,
      phone: store.phone,
      timezone: store.timezone,
      operatingHours: store.operatingHours,
      address: {
        street: store.addressStreet,
        number: store.addressNumber,
        complement: store.addressComplement,
        neighborhood: store.addressNeighborhood,
        city: store.addressCity,
        state: store.addressState,
        postalCode: store.addressPostalCode,
      },
      primaryColor: settings?.primaryColor ?? null,
      secondaryColor: settings?.secondaryColor ?? null,
      menuBannerUrl: settings?.menuBannerUrl ?? null,
      description: settings?.description ?? null,
      instagramHandle: settings?.instagramHandle ?? null,
      whatsappNumber: settings?.whatsappNumber ?? null,
    },
    sections: sections
      .filter((section) => section.products.length > 0)
      .map((section) => ({
        categoryId: section.categoryId,
        categoryName: section.categoryName,
        categoryDescription: section.categoryDescription,
        categoryImageUrl: section.categoryImageUrl,
        products: section.products.map((product) => ({
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          imageUrl: product.imageUrl,
          modifierGroups: product.modifierGroups.map((group) => ({
            id: group.id,
            name: group.name,
            description: group.description,
            isRequired: group.isRequired,
            minSelections: group.minSelections,
            maxSelections: group.maxSelections,
            modifiers: group.modifiers.map((modifier) => ({
              id: modifier.id,
              name: modifier.name,
              priceAdjustment: modifier.priceAdjustment,
            })),
          })),
        })),
      })),
  }
}
