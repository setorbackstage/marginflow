import "server-only"
import type { DbClient } from "../db"
import {
  accountRepository,
  storeRepository,
  storeSettingsRepository,
  roleRepository,
  userRepository,
  membershipRepository,
  refreshTokenRepository,
} from "../repositories"
import { ConflictError } from "../lib/errors"
import { ALL_PERMISSIONS } from "../lib/permissions"
import { slugify } from "../lib/slug"
import { toJsonInput } from "../lib/json"
import { signAccessToken, generateRawToken, hashToken, REFRESH_TOKEN_TTL_SECONDS } from "../lib/auth"
import type { WeeklySchedule } from "../../types/common"
import type { LoginMembershipContext, LoginResult } from "./login.service"

export interface SignupServiceInput {
  storeName: string
  ownerName: string
  email: string
  /** Already hashed by the caller (see `hashPassword`) — signup never sees the plaintext password. */
  passwordHash: string
  phone: string
  storeType: string
}

const MAX_SLUG_ATTEMPTS = 20

/** A sensible, immediately-editable default — Settings → Horários lets the new owner adjust it right after signup. */
function defaultOperatingHours(): WeeklySchedule {
  const openDay = { isOpen: true, slots: [{ open: "09:00", close: "18:00" }] }
  return {
    monday: openDay,
    tuesday: openDay,
    wednesday: openDay,
    thursday: openDay,
    friday: openDay,
    saturday: openDay,
    sunday: { isOpen: false, slots: [] },
  }
}

/**
 * Finds a free `stores.slug` starting from the store name's slugified form,
 * appending `-2`, `-3`, ... on collision. `slug` carries a DB-level unique
 * constraint, so a concurrent signup racing for the same name still fails
 * safely at the INSERT (caught by the caller as a 500) rather than
 * corrupting data — this loop only removes the common-case collision.
 */
async function findAvailableSlug(db: DbClient, storeName: string): Promise<string> {
  const base = slugify(storeName) || "loja"
  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`
    const existing = await storeRepository.findBySlug(db, candidate)
    if (!existing) return candidate
  }
  throw new ConflictError("SLUG_GENERATION_FAILED", "Could not generate a unique store identifier. Try a different store name.")
}

/**
 * `POST /auth/signup`. Provisions a brand-new tenant end-to-end: Account
 * (billing unit), Store, StoreSettings, the store's OWNER Role (all
 * permissions — API_SPEC.md's RBAC table), the User, and an ACTIVE
 * Membership linking them — then issues a session identical in shape to
 * `loginService.login`'s, so the new owner is authenticated immediately
 * without a separate login step. The caller MUST invoke this within
 * `prisma.$transaction` so the whole tenant is created atomically.
 */
export const signupService = {
  async signup(db: DbClient, input: SignupServiceInput): Promise<LoginResult> {
    const [existingUser, existingAccount] = await Promise.all([
      userRepository.findByEmail(db, input.email),
      accountRepository.findByEmail(db, input.email),
    ])
    if (existingUser || existingAccount) {
      throw new ConflictError("EMAIL_ALREADY_REGISTERED", "An account with this email already exists.")
    }

    const slug = await findAvailableSlug(db, input.storeName)

    const account = await accountRepository.create(db, {
      name: input.storeName,
      email: input.email,
      phone: input.phone,
    })

    const store = await storeRepository.create(db, {
      account: { connect: { id: account.id } },
      name: input.storeName,
      slug,
      type: input.storeType,
      phone: input.phone,
      email: input.email,
      operatingHours: toJsonInput(defaultOperatingHours()),
    })

    await storeSettingsRepository.create(db, { store: { connect: { id: store.id } } })

    const ownerRole = await roleRepository.create(db, {
      store: { connect: { id: store.id } },
      name: "OWNER",
      displayName: "Proprietário",
      permissions: [...ALL_PERMISSIONS],
      isSystemRole: true,
    })

    const user = await userRepository.create(db, {
      name: input.ownerName,
      email: input.email,
      phone: input.phone,
      passwordHash: input.passwordHash,
      status: "ACTIVE",
      lastLoginAt: new Date(),
    })

    const now = new Date()
    const membership = await membershipRepository.create(db, {
      user: { connect: { id: user.id } },
      store: { connect: { id: store.id } },
      role: { connect: { id: ownerRole.id } },
      status: "ACTIVE",
      acceptedAt: now,
    })

    const accessToken = signAccessToken(user.id, user.email)
    const rawRefreshToken = generateRawToken()
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000)
    await refreshTokenRepository.create(db, {
      user: { connect: { id: user.id } },
      tokenHash: hashToken(rawRefreshToken),
      expiresAt,
    })

    const memberships: LoginMembershipContext[] = [{ membership, store, role: ownerRole }]

    return { user, memberships, accessToken, refreshToken: rawRefreshToken }
  },
}
