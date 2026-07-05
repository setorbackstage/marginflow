import "dotenv/config"
import { PrismaClient } from "../generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { randomBytes, scrypt } from "node:crypto"
import { promisify } from "node:util"

// We cannot import server/db.ts or server/lib/auth/password.ts directly 
// because they import the 'server-only' package, which throws an error 
// when executed outside of Next.js Webpack/Turbopack.

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const scryptAsync = promisify(scrypt)
const SALT_LENGTH_BYTES = 16
const KEY_LENGTH_BYTES = 64

async function hashPassword(plainPassword: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH_BYTES).toString("hex")
  const derivedKey = (await scryptAsync(plainPassword, salt, KEY_LENGTH_BYTES)) as Buffer
  return `${salt}:${derivedKey.toString("hex")}`
}

async function main() {
  console.log("Starting database seed...")

  // 1. Create Organization
  const org = await prisma.organization.create({
    data: {
      name: "MarginFlow HQ",
      type: "RESTAURANT_GROUP",
    },
  })
  console.log(`Created Organization: ${org.name}`)

  // 2. Create Account
  const account = await prisma.account.create({
    data: {
      organizationId: org.id,
      name: "MarginFlow Testing Account",
      email: "hello@marginflow.app",
      plan: "ENTERPRISE",
      status: "ACTIVE",
    },
  })
  console.log(`Created Account: ${account.name}`)

  // 3. Create Store
  const store = await prisma.store.create({
    data: {
      accountId: account.id,
      name: "MarginFlow Principal",
      slug: "marginflow-principal",
      type: "RESTAURANT",
      status: "ACTIVE",
      phone: "11999999999",
      email: "loja@marginflow.app",
      currency: "BRL",
      operatingHours: {
        monday: { isOpen: true, slots: [{ open: "09:00", close: "22:00" }] },
        tuesday: { isOpen: true, slots: [{ open: "09:00", close: "22:00" }] },
        wednesday: { isOpen: true, slots: [{ open: "09:00", close: "22:00" }] },
        thursday: { isOpen: true, slots: [{ open: "09:00", close: "22:00" }] },
        friday: { isOpen: true, slots: [{ open: "09:00", close: "23:59" }] },
        saturday: { isOpen: true, slots: [{ open: "09:00", close: "23:59" }] },
        sunday: { isOpen: true, slots: [{ open: "09:00", close: "22:00" }] }
      },
      addressCountry: "BR",
      settings: {
        create: {
          autoConfirmOrders: false,
          printReceiptOnConfirm: false,
          receiptFormat: "THERMAL_80MM",
        }
      }
    },
  })
  console.log(`Created Store: ${store.name}`)

  // 4. Create Roles
  const roles = [
    { name: "OWNER", displayName: "Proprietário", permissions: ["*"], isSystemRole: true },
    { name: "MANAGER", displayName: "Gerente", permissions: ["orders:view", "orders:create", "products:view", "products:create"], isSystemRole: true },
    { name: "CASHIER", displayName: "Caixa", permissions: ["orders:view", "orders:create"], isSystemRole: true },
  ]
  const createdRoles: Record<string, any> = {}
  for (const r of roles) {
    createdRoles[r.name] = await prisma.role.create({
      data: {
        storeId: store.id,
        name: r.name,
        displayName: r.displayName,
        permissions: r.permissions,
        isSystemRole: r.isSystemRole,
      }
    })
  }
  console.log(`Created Roles: OWNER, MANAGER, CASHIER`)

  // 5. Create Users and Memberships
  const usersToCreate = [
    { name: "Alice Owner", email: "owner@marginflow.app", role: "OWNER" },
    { name: "Bob Manager", email: "manager@marginflow.app", role: "MANAGER" },
    { name: "Charlie Cashier", email: "cashier@marginflow.app", role: "CASHIER" },
  ]

  for (const u of usersToCreate) {
    const pwdHash = await hashPassword("senha123")
    const user = await prisma.user.create({
      data: {
        name: u.name,
        email: u.email,
        passwordHash: pwdHash,
        status: "ACTIVE",
        memberships: {
          create: {
            storeId: store.id,
            roleId: createdRoles[u.role].id,
            status: "ACTIVE",
          }
        }
      }
    })
    console.log(`Created User: ${user.name} (${user.email}) as ${u.role}`)
  }

  console.log("Database seed completed successfully!")
}

main()
  .catch((e) => {
    console.error("Error during seed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
