"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { fetchMe } from "./api"
import type { Session, SessionMembership } from "./types"

export const SESSION_KEY = ["auth", "me"] as const
const ACTIVE_STORE_STORAGE_KEY = "mf_active_store"

interface SessionContextValue {
  session: Session
  activeStoreId: string
  activeMembership: SessionMembership
  memberships: SessionMembership[]
  setActiveStore: (storeId: string) => void
  /** True when the active store's role grants `permission`. */
  can: (permission: string) => boolean
  isOwnerOrManager: boolean
  /** True when the user holds an OWNER/MANAGER role at *any* store, not just the active one — used for user-level (not store-scoped) gates like the approval password. */
  isOwnerOrManagerAnywhere: boolean
}

const SessionContext = React.createContext<SessionContextValue | null>(null)

/** Reads the persisted active store, falling back to the first ACTIVE membership. */
function resolveInitialStore(memberships: SessionMembership[]): string {
  const stored = typeof window !== "undefined" ? window.localStorage.getItem(ACTIVE_STORE_STORAGE_KEY) : null
  if (stored && memberships.some((m) => m.storeId === stored)) return stored
  return memberships[0]?.storeId ?? ""
}

/**
 * Fetches the session once (`GET /auth/me`) and exposes it plus the active-store
 * selection. Must be mounted inside the authenticated area — `AuthGuard` handles
 * the loading/redirect states before this renders its children.
 */
export function SessionProvider({ session, children }: { session: Session; children: React.ReactNode }) {
  const [activeStoreId, setActiveStoreId] = React.useState(() => resolveInitialStore(session.memberships))

  const setActiveStore = React.useCallback((storeId: string) => {
    setActiveStoreId(storeId)
    if (typeof window !== "undefined") window.localStorage.setItem(ACTIVE_STORE_STORAGE_KEY, storeId)
  }, [])

  const activeMembership =
    session.memberships.find((m) => m.storeId === activeStoreId) ?? session.memberships[0]

  const value = React.useMemo<SessionContextValue>(() => {
    const permissions = new Set(activeMembership?.role.permissions ?? [])
    const roleName = activeMembership?.role.name
    return {
      session,
      activeStoreId: activeMembership?.storeId ?? "",
      activeMembership,
      memberships: session.memberships,
      setActiveStore,
      can: (permission: string) => permissions.has(permission),
      isOwnerOrManager: roleName === "OWNER" || roleName === "MANAGER",
      isOwnerOrManagerAnywhere: session.memberships.some((m) => m.role.name === "OWNER" || m.role.name === "MANAGER"),
    }
  }, [session, activeMembership, setActiveStore])

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useAuth(): SessionContextValue {
  const ctx = React.useContext(SessionContext)
  if (!ctx) throw new Error("useAuth must be used within a SessionProvider")
  return ctx
}

/** The active store id — the single value most feature hooks need for their query keys. */
export function useActiveStoreId(): string {
  return useAuth().activeStoreId
}

/** Permission gate for conditional UI. Returns false until the session is known. */
export function useCan(permission: string): boolean {
  return useAuth().can(permission)
}

/**
 * The raw session query, used by `AuthGuard` to drive loading/redirect. `retry:
 * false` so an unauthenticated visitor fails fast to the login screen instead of
 * hanging through retries (the http client already handles the refresh attempt).
 */
export function useSessionQuery() {
  return useQuery({
    queryKey: SESSION_KEY,
    queryFn: ({ signal }) => fetchMe(signal),
    retry: false,
    staleTime: 60_000,
  })
}
