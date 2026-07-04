import "server-only"
import type { Category } from "@/generated/prisma/client"
import { prisma } from "@/server/db"
import { productRepository } from "@/server/repositories"

/** API_SPEC.md `GET /api/v1/stores/:storeId/categories(/:categoryId)` — shared shape, `productCount` computed. */
export async function toCategoryResponse(category: Category) {
  const productCount = await productRepository.count(prisma, { categoryId: category.id, deletedAt: null })
  return {
    id: category.id,
    storeId: category.storeId,
    name: category.name,
    description: category.description,
    imageUrl: category.imageUrl,
    sortOrder: category.sortOrder,
    isActive: category.isActive,
    productCount,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  }
}
