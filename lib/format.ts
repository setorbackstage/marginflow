import type { Cents, ISODateTime } from "@/types/common"

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" })
const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" })
const timeFormatter = new Intl.DateTimeFormat("pt-BR", { timeStyle: "short" })

/** Formats integer cents as BRL currency (e.g. 1099 -> "R$ 10,99"). */
export function formatCents(cents: Cents): string {
  return currencyFormatter.format(cents / 100)
}

export function formatDateTime(value: ISODateTime | null | undefined): string {
  if (!value) return "—"
  return dateTimeFormatter.format(new Date(value))
}

export function formatDate(value: ISODateTime | null | undefined): string {
  if (!value) return "—"
  return dateFormatter.format(new Date(value))
}

export function formatTime(value: ISODateTime | null | undefined): string {
  if (!value) return "—"
  return timeFormatter.format(new Date(value))
}

/** Relative "há 5 min" style label for recent timestamps, falling back to a short date. */
export function formatRelative(value: ISODateTime | null | undefined): string {
  if (!value) return "—"
  const date = new Date(value)
  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.round(diffMs / 60_000)
  if (diffMin < 1) return "agora"
  if (diffMin < 60) return `há ${diffMin} min`
  const diffHours = Math.round(diffMin / 60)
  if (diffHours < 24) return `há ${diffHours} h`
  return formatDate(value)
}
