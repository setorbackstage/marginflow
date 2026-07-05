"use client"

import * as React from "react"

import { navGroups } from "@/lib/navigation"
import { cn } from "@/lib/utils"
import {
  Sidebar,
  SidebarContent,
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
      <SidebarRail />
    </Sidebar>
  )
}
