"use client"

import {
  ChevronsUpDown,
  CreditCard,
  LogOut,
  Settings,
  Sparkles,
  CircleUserRound,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const user = {
  name: "Alex Moreno",
  email: "alex@marginflow.app",
  initials: "AM",
}

export function NavUser() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className="h-8 gap-2 px-1.5 pr-2 data-[state=open]:bg-muted"
            aria-label="Open user menu"
          />
        }
      >
        <Avatar className="size-6 rounded-md">
          <AvatarImage src="/user-avatar.png" alt="" />
          <AvatarFallback className="rounded-md text-[0.7rem]">
            {user.initials}
          </AvatarFallback>
        </Avatar>
        <span className="hidden text-sm font-medium lg:inline-block">
          {user.name}
        </span>
        <ChevronsUpDown className="hidden text-muted-foreground lg:inline-block" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-60 rounded-lg">
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-1.5 py-2 text-left">
            <Avatar className="size-8 rounded-md">
              <AvatarImage src="/user-avatar.png" alt="" />
              <AvatarFallback className="rounded-md text-xs">
                {user.initials}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 leading-tight">
              <span className="truncate text-sm font-medium">{user.name}</span>
              <span className="truncate text-xs text-muted-foreground">
                {user.email}
              </span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="gap-2">
          <Sparkles />
          Upgrade to Pro
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem className="gap-2">
            <CircleUserRound />
            Account
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2">
            <CreditCard />
            Billing
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2">
            <Settings />
            Settings
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" className="gap-2">
          <LogOut />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
