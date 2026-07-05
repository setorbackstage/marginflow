"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-shell/app-sidebar"
import { TopBar } from "@/components/app-shell/top-bar"
import { PageContainer } from "@/components/app-shell/page-container"
import { navGroups } from "@/lib/navigation"

/** Resolves the sidebar item that owns the current path (exact, then longest prefix). */
function resolveActiveNav(pathname: string): { url: string; title: string } {
  const items = navGroups.flatMap((group) => group.items)
  const exact = items.find((item) => item.url === pathname)
  if (exact) return { url: exact.url, title: exact.title }

  let best: { url: string; title: string } | null = null
  for (const item of items) {
    if (item.url !== "/" && pathname.startsWith(item.url) && (!best || item.url.length > best.url.length)) {
      best = { url: item.url, title: item.title }
    }
  }
  return best ?? { url: pathname, title: "MarginFlow" }
}

/**
 * Router-backed app shell. Reuses the existing `AppSidebar`/`TopBar` unchanged —
 * their `onNavigate` callback is wired to `router.push` and active state is
 * derived from the URL, turning the previously state-only shell into real
 * Next.js navigation.
 */
export function AppShellLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  const onNavigate = React.useCallback((url: string) => router.push(url), [router])
  const active = resolveActiveNav(pathname)

  return (
    <SidebarProvider>
      <AppSidebar activeUrl={active.url} onNavigate={onNavigate} />
      <SidebarInset className="min-w-0">
        <TopBar crumb={active.title} onNavigate={onNavigate} />
        <PageContainer>{children}</PageContainer>
      </SidebarInset>
    </SidebarProvider>
  )
}
