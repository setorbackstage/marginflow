"use client"

import * as React from "react"
import { Search } from "lucide-react"

import { navGroups } from "@/lib/navigation"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

export function GlobalSearch({
  onNavigate,
  iconOnly = false,
}: {
  onNavigate: (url: string, title: string) => void
  iconOnly?: boolean
}) {
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  return (
    <>
      {iconOnly ? (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Search"
          onClick={() => setOpen(true)}
        >
          <Search />
        </Button>
      ) : (
        <Button
          variant="outline"
          onClick={() => setOpen(true)}
          className="h-8 w-full justify-start gap-2 px-2.5 text-muted-foreground sm:w-64 lg:w-72"
        >
          <Search className="text-muted-foreground" />
          <span className="flex-1 text-left text-sm font-normal">Search…</span>
          <Kbd className="hidden sm:inline-flex">⌘K</Kbd>
        </Button>
      )}

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search pages, orders, customers…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {navGroups.map((group) => (
            <CommandGroup key={group.label} heading={group.label}>
              {group.items.map((item) => (
                <CommandItem
                  key={item.title}
                  value={item.title}
                  onSelect={() => {
                    onNavigate(item.url, item.title)
                    setOpen(false)
                  }}
                >
                  <item.icon />
                  <span>{item.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  )
}
