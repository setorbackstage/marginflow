"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Plus } from "lucide-react"

import { restaurants, type Restaurant } from "@/lib/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

function RestaurantMark({ initials }: { initials: string }) {
  return (
    <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
      {initials}
    </div>
  )
}

export function RestaurantSwitcher() {
  const { isMobile } = useSidebar()
  const [active, setActive] = React.useState<Restaurant>(restaurants[0])

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              />
            }
          >
            <RestaurantMark initials={active.initials} />
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">{active.name}</span>
              <span className="truncate text-xs text-muted-foreground">
                {active.type}
              </span>
            </div>
            <ChevronsUpDown className="ml-auto text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-64 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Selecionar loja
            </DropdownMenuLabel>
            <DropdownMenuGroup>
              {restaurants.map((restaurant, index) => (
                <DropdownMenuItem
                  key={restaurant.id}
                  onClick={() => setActive(restaurant)}
                  className="gap-2 p-2"
                >
                  <RestaurantMark initials={restaurant.initials} />
                  <div className="grid flex-1 leading-tight">
                    <span className="truncate text-sm font-medium">
                      {restaurant.name}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {restaurant.type}
                    </span>
                  </div>
                  {active.id === restaurant.id ? (
                    <Check className="size-4 text-primary" />
                  ) : (
                    <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2 text-muted-foreground">
              <div className="flex size-8 items-center justify-center rounded-md border border-dashed">
                <Plus className="size-4" />
              </div>
              <span className="text-sm font-medium">Add restaurant</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
