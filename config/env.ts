import "server-only"
import { z } from "zod"

/**
 * Server-only environment configuration. Validated once at module load —
 * fails fast with a clear error instead of surfacing a confusing failure
 * deep inside Prisma or a route handler later.
 */
/** PEM keys are stored in `.env` with literal `\n` escapes — unescape to real newlines. */
function normalizePem(pem: string): string {
  return pem.includes("\\n") ? pem.replace(/\\n/g, "\n") : pem
}

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  /** RS256 private key (PEM) — signs access tokens. API_SPEC.md's JWT Strategy. */
  JWT_PRIVATE_KEY: z.string().min(1, "JWT_PRIVATE_KEY is required").transform(normalizePem),
  /** RS256 public key (PEM) — validates access tokens. */
  JWT_PUBLIC_KEY: z.string().min(1, "JWT_PUBLIC_KEY is required").transform(normalizePem),
  /** Supabase project URL — used for Storage REST API uploads. */
  SUPABASE_URL: z.string().min(1, "SUPABASE_URL is required"),
  /** Supabase anon key — used for Storage REST API uploads. */
  SUPABASE_ANON_KEY: z.string().min(1, "SUPABASE_ANON_KEY is required"),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  const issues = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("\n")
  throw new Error(`Invalid environment configuration:\n${issues}`)
}

export const env = parsed.data
