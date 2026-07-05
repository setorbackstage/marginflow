"use client"

import { Search } from "lucide-react"
import { InputGroup, InputGroupInput, InputGroupAddon } from "@/components/ui/input-group"

/** Debounced-by-caller search input — the caller owns the value/state so it can control the debounce timing. */
export function SearchBar({
  value,
  onChange,
  placeholder = "Buscar...",
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <InputGroup className="w-full max-w-sm">
      <InputGroupAddon>
        <Search className="size-4" />
      </InputGroupAddon>
      <InputGroupInput
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
    </InputGroup>
  )
}
