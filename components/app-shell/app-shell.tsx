"use client"

import * as React from "react"
import { Plus, SlidersHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-shell/app-sidebar"
import { TopBar } from "@/components/app-shell/top-bar"
import {
  PageContainer,
  PageHeader,
} from "@/components/app-shell/page-container"
import { PlaceholderContent } from "@/components/app-shell/placeholder-content"

export function AppShell() {
  const [active, setActive] = React.useState({
    url: "/",
    title: "Dashboard",
  })

  const handleNavigate = React.useCallback((url: string, title: string) => {
    setActive({ url, title })
  }, [])

  return (
    <SidebarProvider>
      <AppSidebar activeUrl={active.url} onNavigate={handleNavigate} />
      <SidebarInset className="min-w-0">
        <TopBar crumb={active.title} onNavigate={handleNavigate} />
        <PageContainer>
          <div className="flex flex-col gap-6">
            <PageHeader
              title={active.title}
              description="This is a foundation shell — placeholder cards demonstrate the layout and spacing."
              actions={
                <>
                  <Button variant="outline" size="sm">
                    <SlidersHorizontal data-icon="inline-start" />
                    Filters
                  </Button>
                  <Button size="sm">
                    <Plus data-icon="inline-start" />
                    New
                  </Button>
                </>
              }
            />
            <PlaceholderContent />
          </div>
        </PageContainer>
      </SidebarInset>
    </SidebarProvider>
  )
}
