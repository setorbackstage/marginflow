/** Returns a date string N days before today (YYYY-MM-DD, local). */
export function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

/** Returns today as YYYY-MM-DD. */
export function today(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Short date label for charts: "12/07" */
export function shortDate(iso: string): string {
  const [, m, d] = iso.split("-")
  return `${d}/${m}`
}
