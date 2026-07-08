"use client"

import * as React from "react"

import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

/** Sprint 1 "Telefones": common countries, BR pre-selected — not a full ITU list. */
const COUNTRIES = [
  { code: "BR", dial: "55", flag: "🇧🇷", name: "Brasil" },
  { code: "US", dial: "1", flag: "🇺🇸", name: "Estados Unidos" },
  { code: "PT", dial: "351", flag: "🇵🇹", name: "Portugal" },
  { code: "AR", dial: "54", flag: "🇦🇷", name: "Argentina" },
] as const

type CountryCode = (typeof COUNTRIES)[number]["code"]

function maskNationalNumber(dial: string, digits: string): string {
  if (dial === "55") {
    // Brazilian mobile (11 digits incl. DDD) or landline (10 digits incl. DDD).
    const ddd = digits.slice(0, 2)
    const rest = digits.slice(2)
    if (digits.length <= 2) return ddd
    if (rest.length <= 4) return `(${ddd}) ${rest}`
    const isMobile = rest.length > 8
    const splitAt = isMobile ? 5 : 4
    return `(${ddd}) ${rest.slice(0, splitAt)}-${rest.slice(splitAt, splitAt + 4)}`
  }
  // Generic grouping for other countries: chunks of 3-4 digits.
  return digits.replace(/(\d{2,4})(?=\d)/g, "$1 ").trim()
}

/** Splits a stored "+<dial><digits>" value into its country + national-number parts. */
function parseValue(value: string): { country: CountryCode; digits: string } {
  const match = /^\+?(\d+)$/.exec(value.trim())
  if (!match) return { country: "BR", digits: "" }
  const raw = match[1]!
  for (const country of COUNTRIES) {
    if (raw.startsWith(country.dial)) {
      return { country: country.code, digits: raw.slice(country.dial.length) }
    }
  }
  return { country: "BR", digits: raw }
}

/**
 * International phone input — country selector (Brazil pre-selected) plus an
 * auto-masked national number field. Stores/emits the value as a plain
 * "+<countrydial><digits>" string (e.g. "+5511999990000"), matching what
 * every phone field in the API already accepts.
 */
export function PhoneInput({
  id,
  value,
  onChange,
  onBlur,
  disabled,
  "aria-invalid": ariaInvalid,
  className,
}: {
  id?: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  disabled?: boolean
  "aria-invalid"?: boolean
  className?: string
}) {
  const parsed = parseValue(value)
  const country = COUNTRIES.find((c) => c.code === parsed.country) ?? COUNTRIES[0]

  function emit(nextCountryDial: string, nextDigits: string) {
    onChange(nextDigits ? `+${nextCountryDial}${nextDigits}` : "")
  }

  return (
    <div className={cn("flex gap-1.5", className)}>
      <Select
        value={country.code}
        onValueChange={(nextCode) => {
          const next = COUNTRIES.find((c) => c.code === nextCode) ?? COUNTRIES[0]
          emit(next.dial, parsed.digits)
        }}
        disabled={disabled}
      >
        <SelectTrigger className="w-[92px] shrink-0" aria-label="País">
          <SelectValue>
            {country.flag} +{country.dial}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {COUNTRIES.map((c) => (
            <SelectItem key={c.code} value={c.code}>
              {c.flag} {c.name} (+{c.dial})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        id={id}
        type="tel"
        inputMode="tel"
        aria-invalid={ariaInvalid}
        disabled={disabled}
        placeholder={country.dial === "55" ? "(11) 99999-0000" : "Número"}
        value={maskNationalNumber(country.dial, parsed.digits)}
        onChange={(e) => emit(country.dial, e.target.value.replace(/\D/g, "").slice(0, 13))}
        onBlur={onBlur}
      />
    </div>
  )
}
