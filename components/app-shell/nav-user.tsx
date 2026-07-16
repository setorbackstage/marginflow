"use client"

import {
  ChevronsUpDown,
  LogOut,
  Settings,
  User,
  Loader2,
} from "lucide-react"
import { useRouter } from "next/navigation"

import { useAuth, useLogout } from "@/features/auth"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ""
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : ""
  return (first + last).toUpperCase()
}

export function NavUser() {
  const router = useRouter()
  const { session } = useAuth()
  const logout = useLogout()
  const user = session.user
  const initials = initialsOf(user.name)

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
          <AvatarFallback className="rounded-md text-[0.7rem]">{initials}</AvatarFallback>
        </Avatar>
        <span className="hidden text-sm font-medium lg:inline-block">
          {user.name}
        </span>
        <ChevronsUpDown className="hidden text-muted-foreground lg:inline-block" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-60 rounded-lg">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="p-0 font-normal">
            <div className="flex items-center gap-2 px-1.5 py-2 text-left">
              <Avatar className="size-8 rounded-md">
                <AvatarFallback className="rounded-md text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 leading-tight">
                <span className="truncate text-sm font-medium">{user.name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {user.email}
                </span>
              </div>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem className="gap-2" onClick={() => router.push("/profile")}>
            <User />
            Meu perfil
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2" onClick={() => router.push("/settings")}>
            <Settings />
            Configurações
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" className="gap-2" disabled={logout.isPending} onClick={() => logout.mutate()}>
          {logout.isPending ? <Loader2 className="animate-spin" /> : <LogOut />}
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
