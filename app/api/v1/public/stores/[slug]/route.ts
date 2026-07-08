import "server-only"
import type { NextRequest } from "next/server"
import { prisma } from "@/server/db"
import { publicMenuService, toPublicStorefrontDTO } from "@/server/services"
import { NotFoundError } from "@/server/lib"
import {
  compose,
  withErrorHandling,
  withRequestContext,
  ok,
} from "@/server/lib/http"

interface RouteContext {
  params: Promise<{ slug: string }>
}

/**
 * Sprint 2 "Canal Próprio" — the ONLY unauthenticated store-data route in
 * the API. Deliberately not nested under `/stores/:storeId` (which always
 * requires auth) — lives at `/public/stores/:slug` and returns just enough
 * to render the public menu page: no PII, no operational data, no
 * permission checks. Mirrors the shape the `/r/[slug]` page's server
 * component fetches directly for SSR — see `toPublicStorefrontDTO`.
 */
async function handleGetStorefront(
  _request: NextRequest,
  { params }: RouteContext,
): Promise<Response> {
  const { slug } = await params
  const storefront = await publicMenuService.getStorefront(prisma, slug)
  if (!storefront) {
    throw new NotFoundError(
      "STORE_NOT_FOUND",
      "This store's public menu is not available.",
    )
  }
  return ok(toPublicStorefrontDTO(storefront))
}

export const GET = compose(
  withRequestContext,
  withErrorHandling,
)(handleGetStorefront)
