import "server-only"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient, Prisma } from "../generated/prisma/client"
import { env } from "../config/env"

/**
 * Shared Prisma Client singleton. Hot-reload-safe: Next.js dev mode reloads
 * modules on every request, which would otherwise create a new PrismaClient
 * (and a new DB connection pool) on every reload. Stashing the instance on
 * `globalThis` survives module reloads in development.
 *
 * Prisma 7's generated client requires an explicit driver adapter instead of
 * connecting directly from a `url` in the datasource block — see
 * prisma.config.ts, which supplies DATABASE_URL to the schema/migrate CLI,
 * and this file, which supplies it to the runtime client via @prisma/adapter-pg.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL })

export const prisma: PrismaClient = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}

/**
 * Any repository function that accepts a `DbClient` can be called either
 * with the shared singleton (the default) or with the transaction client
 * Prisma passes into a `prisma.$transaction(async (tx) => { ... })`
 * callback. This is what lets the Service layer compose multiple
 * repository calls into a single atomic transaction.
 */
export type DbClient = PrismaClient | Prisma.TransactionClient
