"use client"

import * as React from "react"
import { Search, Loader2 } from "lucide-react"

import { navGroups } from "@/lib/navigation"
import { useDebouncedValue } from "@/hooks"
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
import { useGlobalSearch } from "./use-global-search"

export function GlobalSearch({
  onNavigate,
  iconOnly = false,
}: {
  onNavigate: (url: string, title: string) => void
  iconOnly?: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const debouncedQuery = useDebouncedValue(query, 250)
  const search = useGlobalSearch(debouncedQuery)
  const isSearching = debouncedQuery.trim().length >= 2

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

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) setQuery("")
  }

  const navigate = (url: string, title: string) => {
    onNavigate(url, title)
    setOpen(false)
  }

  return (
    <>
      {iconOnly ? (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Buscar"
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
          <span className="flex-1 text-left text-sm font-normal">Buscar…</span>
          <Kbd className="hidden sm:inline-flex">⌘K</Kbd>
        </Button>
      )}

      <CommandDialog open={open} onOpenChange={handleOpenChange}>
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder="Buscar produtos, pedidos, clientes, estoque..."
        />
        <CommandList>
          {isSearching ? (
            search.isLoading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Buscando...
              </div>
            ) : search.isError ? (
              <p className="py-6 text-center text-sm text-destructive">Não foi possível buscar. Tente novamente.</p>
            ) : search.data && search.data.length > 0 ? (
              search.data.map((group) => (
                <CommandGroup key={group.heading} heading={group.heading}>
                  {group.items.map((item) => (
                    <CommandItem key={item.id} value={`${group.heading}-${item.id}`} onSelect={() => navigate(item.url, item.title)}>
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate">{item.title}</span>
                        {item.subtitle ? <span className="truncate text-xs text-muted-foreground">{item.subtitle}</span> : null}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))
            ) : (
              <CommandEmpty>Nenhum resultado para &quot;{debouncedQuery}&quot;.</CommandEmpty>
            )
          ) : (
            <>
              <CommandEmpty>Digite ao menos 2 caracteres para buscar.</CommandEmpty>
              {navGroups.map((group) => (
                <CommandGroup key={group.label} heading={group.label}>
                  {group.items.map((item) => (
                    <CommandItem key={item.title} value={item.title} onSelect={() => navigate(item.url, item.title)}>
                      <item.icon />
                      <span>{item.title}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}
