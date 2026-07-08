import type { WeeklySchedule, DaySchedule } from "@/types/common"

const DAY_KEYS: (keyof WeeklySchedule)[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
]

function minutesOfDay(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

/** "now" in the store's own timezone, as day-of-week + minutes-since-midnight — avoids pulling in a date library for one conversion. */
function nowInTimezone(timezone: string): {
  day: keyof WeeklySchedule
  minutes: number
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date())

  const weekday =
    parts.find((p) => p.type === "weekday")?.value.toLowerCase() ?? "monday"
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0")
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0")
  const day = (DAY_KEYS.find((d) => d === weekday) ??
    "monday") as keyof WeeklySchedule
  return { day, minutes: hour * 60 + minute }
}

function isWithinSlots(schedule: DaySchedule, minutes: number): boolean {
  if (!schedule.isOpen) return false
  return schedule.slots.some(
    (slot) =>
      minutes >= minutesOfDay(slot.open) && minutes < minutesOfDay(slot.close),
  )
}

/** Whether the store is open right now, per its own operating hours and timezone. */
export function isStoreOpenNow(
  operatingHours: WeeklySchedule,
  timezone: string,
): boolean {
  const { day, minutes } = nowInTimezone(timezone)
  return isWithinSlots(operatingHours[day], minutes)
}
