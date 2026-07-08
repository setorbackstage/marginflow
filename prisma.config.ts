import "dotenv/config"
import { defineConfig } from "prisma/config"

/**
 * Prisma 7 removed `url`/`directUrl` from schema.prisma — this `datasource.url`
 * is now the only connection string the CLI (validate/generate/migrate/db
 * seed) uses, and @prisma/config's `Datasource` type has no `directUrl`
 * counterpart to it. That split is instead achieved by using two entirely
 * separate env vars for two separate code paths that already don't share
 * config:
 *   - This file (CLI only) uses DIRECT_URL — a direct, unpooled connection.
 *     `migrate`/`db push`/`introspect` need session-level Postgres features
 *     (advisory locks, DDL, long-lived transactions) that Supabase's
 *     Pooler (PgBouncer, transaction mode, port 6543) does not support.
 *   - server/db.ts (the running app, via @prisma/adapter-pg) uses
 *     DATABASE_URL — the pooled connection (port 6543) — independently of
 *     this file, since Prisma 7's driver-adapter runtime never reads
 *     prisma.config.ts's datasource at all.
 * Locally (docker-compose Postgres, no pooler), DATABASE_URL and DIRECT_URL
 * are simply the same value — see .env.example.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env["DIRECT_URL"],
  },
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
})
