"use client"

import Image from "next/image"
import { Check, ChevronsUpDown } from "lucide-react"

import { useAuth } from "@/features/auth"
import { useStore } from "@/features/stores"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ""
  const second = parts[1]?.[0] ?? ""
  return (first + second).toUpperCase()
}

function StoreMark({ name, logoUrl }: { name: string; logoUrl?: string | null }) {
  if (logoUrl) {
    return (
      <div className="relative aspect-square size-8 shrink-0 overflow-hidden rounded-md border">
        <Image src={logoUrl} alt="" fill sizes="32px" className="object-cover" unoptimized />
      </div>
    )
  }
  return (
    <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
      {initialsOf(name)}
    </div>
  )
}

/** Store switcher — driven entirely by the session's real memberships, never a fixed/demo list. */
export function RestaurantSwitcher() {
  const { isMobile } = useSidebar()
  const { memberships, activeMembership, setActiveStore } = useAuth()
  // Branding (logo) is not part of the session/membership shape — fetched separately.
  const store = useStore()

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
            <StoreMark name={activeMembership.storeName} logoUrl={store.data?.logoUrl} />
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">{activeMembership.storeName}</span>
              <span className="truncate text-xs text-muted-foreground">{activeMembership.role.displayName}</span>
            </div>
            {memberships.length > 1 ? <ChevronsUpDown className="ml-auto text-muted-foreground" /> : null}
          </DropdownMenuTrigger>
          {memberships.length > 1 ? (
            <DropdownMenuContent
              className="min-w-64 rounded-lg"
              align="start"
              side={isMobile ? "bottom" : "right"}
              sideOffset={4}
            >
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-xs text-muted-foreground">Selecionar loja</DropdownMenuLabel>
                {memberships.map((membership) => (
                  <DropdownMenuItem
                    key={membership.storeId}
                    onClick={() => setActiveStore(membership.storeId)}
                    className="gap-2 p-2"
                  >
                    <StoreMark name={membership.storeName} />
                    <div className="grid flex-1 leading-tight">
                      <span className="truncate text-sm font-medium">{membership.storeName}</span>
                      <span className="truncate text-xs text-muted-foreground">{membership.role.displayName}</span>
                    </div>
                    {activeMembership.storeId === membership.storeId ? <Check className="size-4 text-primary" /> : null}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          ) : null}
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
