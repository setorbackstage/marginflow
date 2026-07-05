/** Shapes returned by `GET /auth/me` (the canonical session source). */

export interface SessionRole {
  id: string
  name: string
  displayName: string
  permissions: string[]
}

export interface SessionMembership {
  storeId: string
  storeName: string
  storeSlug: string
  storeLogoUrl?: string | null
  membershipStatus: string
  role: SessionRole
}

export interface SessionUser {
  id: string
  name: string
  email: string
  phone?: string | null
  avatarUrl?: string | null
  status: string
  lastLoginAt?: string | null
  createdAt?: string | null
}

export interface Session {
  user: SessionUser
  memberships: SessionMembership[]
}

export interface LoginInput {
  email: string
  password: string
}
