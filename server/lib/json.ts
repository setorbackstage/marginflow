import "server-only"
import { Prisma } from "../../generated/prisma/client"

/** Casts a plain typed object/array into Prisma's structural `InputJsonValue` for a required Json column. */
export function toJsonInput(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue
}

/** Same as `toJsonInput`, but maps `null`/`undefined` to Prisma's `JsonNull` sentinel for a nullable Json column. */
export function toNullableJsonInput(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (value === undefined) return undefined
  if (value === null) return Prisma.JsonNull
  return value as Prisma.InputJsonValue
}
