import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { prisma } from "@/server/db"
import { publicMenuService, toPublicStorefrontDTO } from "@/server/services"
import { Storefront } from "@/features/public-menu"
import type { PublicStorefront } from "@/features/public-menu"

interface PageProps {
  params: Promise<{ slug: string }>
}

async function getStorefront(slug: string) {
  const storefront = await publicMenuService.getStorefront(prisma, slug)
  if (!storefront) return null
  return toPublicStorefrontDTO(storefront) as unknown as PublicStorefront
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params
  const data = await getStorefront(slug)
  if (!data) return { title: "Cardápio não encontrado" }

  const { store } = data
  const title = `${store.name} — Cardápio online`
  const description =
    store.description ??
    `Confira o cardápio de ${store.name} e monte seu pedido.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: store.menuBannerUrl
        ? [store.menuBannerUrl]
        : store.logoUrl
          ? [store.logoUrl]
          : undefined,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    alternates: { canonical: `/r/${store.slug}` },
  }
}

/**
 * Sprint 2 "Canal Próprio" — the public, unauthenticated menu page. Fetches
 * directly through `publicMenuService` (not the `/api/v1/public/...` HTTP
 * route) for a real server-rendered first paint — mobile-first, no login,
 * SEO-friendly per the sprint's requirements.
 */
export default async function PublicMenuPage({ params }: PageProps) {
  const { slug } = await params
  const data = await getStorefront(slug)
  if (!data) notFound()

  return <Storefront storefront={data} />
}
