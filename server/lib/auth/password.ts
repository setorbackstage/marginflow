import "server-only"
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto"
import { promisify } from "node:util"

const scryptAsync = promisify(scrypt)
const SALT_LENGTH_BYTES = 16
const KEY_LENGTH_BYTES = 64

/**
 * Password hashing via Node's built-in `scrypt` — no external dependency.
 * Stored format: `<saltHex>:<derivedKeyHex>`. Never store or log the
 * plaintext password.
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH_BYTES).toString("hex")
  const derivedKey = (await scryptAsync(plainPassword, salt, KEY_LENGTH_BYTES)) as Buffer
  return `${salt}:${derivedKey.toString("hex")}`
}

/** Timing-safe comparison against a stored `hashPassword` output. */
export async function verifyPassword(plainPassword: string, storedHash: string): Promise<boolean> {
  const [salt, derivedKeyHex] = storedHash.split(":")
  if (!salt || !derivedKeyHex) return false

  const derivedKey = (await scryptAsync(plainPassword, salt, KEY_LENGTH_BYTES)) as Buffer
  const storedKey = Buffer.from(derivedKeyHex, "hex")
  if (derivedKey.length !== storedKey.length) return false

  return timingSafeEqual(derivedKey, storedKey)
}
