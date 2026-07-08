"use client"

import { Bell } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const items = [
  {
    title: "New order #4821",
    description: "Table 12 · 3 items · $48.20",
    time: "2m",
    unread: true,
  },
  {
    title: "Low stock alert",
    description: "Mozzarella is running low",
    time: "18m",
    unread: true,
  },
  {
    title: "Delivery completed",
    description: "Order #4790 delivered on time",
    time: "1h",
    unread: false,
  },
]

export function Notifications() {
  const unread = items.filter((i) => i.unread).length

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
            className="relative"
          />
        }
      >
        <Bell />
        {unread > 0 ? (
          <span className="absolute right-1 top-1 size-1.5 rounded-full bg-primary ring-2 ring-background" />
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-80 rounded-lg">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center justify-between text-sm font-medium text-foreground">
            Notifications
            <span className="text-xs font-normal text-muted-foreground">
              {unread} unread
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {items.map((item) => (
          <DropdownMenuItem
            key={item.title}
            className="flex flex-col items-start gap-0.5 p-2.5"
          >
            <div className="flex w-full items-center gap-2">
              {item.unread ? (
                <span className="size-1.5 shrink-0 rounded-full bg-primary" />
              ) : (
                <span className="size-1.5 shrink-0 rounded-full bg-transparent" />
              )}
              <span className="flex-1 text-sm font-medium">{item.title}</span>
              <span className="text-xs text-muted-foreground">{item.time}</span>
            </div>
            <span className="pl-3.5 text-xs text-muted-foreground">
              {item.description}
            </span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="justify-center text-sm font-medium text-primary">
          View all notifications
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
