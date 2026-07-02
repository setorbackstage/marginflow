"use client"

import * as React from "react"
import { Sparkles } from "lucide-react"

import { navGroups } from "@/lib/navigation"
import { cn } from "@/lib/utils"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { RestaurantSwitcher } from "@/components/app-shell/restaurant-switcher"

export function AppSidebar({
  activeUrl,
  onNavigate,
}: {
  activeUrl: string
  onNavigate: (url: string, title: string) => void
}) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <RestaurantSwitcher />
      </SidebarHeader>
      <SidebarSeparator className="mx-0" />
      <SidebarContent className="gap-0 px-1">
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => {
                const isActive = activeUrl === item.url
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.title}
                      onClick={() => onNavigate(item.url, item.title)}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                    {item.badge ? (
                      <SidebarMenuBadge
                        className={cn(
                          "text-[0.7rem]",
                          isActive && "text-sidebar-accent-foreground"
                        )}
                      >
                        {item.badge}
                      </SidebarMenuBadge>
                    ) : null}
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center gap-3 rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-3 group-data-[collapsible=icon]:hidden">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
            <Sparkles className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">Upgrade to Pro</p>
            <p className="truncate text-xs text-muted-foreground">
              Unlock forecasting & AI insights
            </p>
          </div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
