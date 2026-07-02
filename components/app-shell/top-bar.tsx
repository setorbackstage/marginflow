"use client"

import * as React from "react"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { GlobalSearch } from "@/components/app-shell/global-search"
import { NavUser } from "@/components/app-shell/nav-user"
import { Notifications } from "@/components/app-shell/notifications"
import { ThemeToggle } from "@/components/app-shell/theme-toggle"

export function TopBar({
  crumb,
  onNavigate,
}: {
  crumb: string
  onNavigate: (url: string, title: string) => void
}) {
  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/80 px-3 backdrop-blur-md sm:px-4">
      <div className="flex flex-1 items-center gap-2 overflow-hidden">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-1 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden sm:block">
              <BreadcrumbLink
                onClick={() => onNavigate("/", "Dashboard")}
                className="cursor-pointer"
              >
                MarginFlow
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden sm:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>{crumb}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="hidden md:block">
        <GlobalSearch onNavigate={onNavigate} />
      </div>

      <Separator orientation="vertical" className="mx-1 hidden h-4 md:block" />

      <div className="flex items-center gap-0.5">
        <div className="md:hidden">
          <GlobalSearch onNavigate={onNavigate} iconOnly />
        </div>
        <Notifications />
        <ThemeToggle />
      </div>

      <Separator orientation="vertical" className="mx-1 h-4" />
      <NavUser />
    </header>
  )
}
