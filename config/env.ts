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
  /**
   * Resend API key — transactional emails (reset de senha, convites).
   * Opcional: se ausente, e-mails são logados em desenvolvimento e silenciados em produção.
   * Obtenha em https://resend.com
   */
  RESEND_API_KEY: z.string().optional(),
  /** Endereço remetente. Deve pertencer a um domínio verificado no Resend. */
  RESEND_FROM_EMAIL: z.string().email().optional().default("noreply@marginflow.app"),
  /**
   * Segredo compartilhado configurado no portal iFood para autenticar webhooks recebidos.
   * OBRIGATÓRIO em produção: sem ele, o endpoint /api/webhooks/ifood responde 503.
   * Passe no header `x-ifood-webhook-secret` ao registrar o endpoint no iFood.
   */
  IFOOD_WEBHOOK_SECRET: z.string().min(1, "IFOOD_WEBHOOK_SECRET is required"),
  /**
   * 99Food open API configuration.
   * NINETYNINEFOOD_APP_ID / NINETYNINEFOOD_APP_SECRET: credentials from the 99Food
   *   partner portal (openapi.99food.com). Used to fetch the `auth_token`.
   * NINETYNINEFOOD_WEBHOOK_SECRET: OBRIGATÓRIO em produção. Shared secret for webhook
   *   verification (header `x-99food-webhook-secret`). Sem ele, /api/webhooks/99food
   *   responde 503 — a verificação NUNCA é pulada (VULN-001).
   * NINETYNINEFOOD_BASE_URL: API base (defaults to https://openapi.99food.com).
   */
  NINETYNINEFOOD_APP_ID: z.string().optional(),
  NINETYNINEFOOD_APP_SECRET: z.string().optional(),
  NINETYNINEFOOD_WEBHOOK_SECRET: z.string().min(1, "NINETYNINEFOOD_WEBHOOK_SECRET is required"),
  NINETYNINEFOOD_BASE_URL: z.string().optional(),
  /**
   * Supabase SERVICE_ROLE key — usada APENAS server-side para escrita no Storage
   * (uploads). NUNCA exposta ao cliente (não tem prefixo NEXT_PUBLIC_).
   */
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  const issues = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("\n")
  throw new Error(`Invalid environment configuration:\n${issues}`)
}

export const env = parsed.data
