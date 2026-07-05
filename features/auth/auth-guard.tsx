"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useSessionQuery } from "./session"
import { SessionProvider } from "./session"

function FullScreenLoader() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  )
}

/**
 * Route guard for the authenticated app area. Resolves the session via
 * `GET /auth/me` (the http client transparently attempts a token refresh on a
 * cold load). While resolving it shows a loader; on any auth failure it
 * redirects to `/login`; on success it provides the session to the subtree.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { data, isLoading, isError } = useSessionQuery()

  React.useEffect(() => {
    if (isError) router.replace("/login")
  }, [isError, router])

  if (isLoading || isError || !data) return <FullScreenLoader />

  if (data.memberships.length === 0) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-2 bg-background px-6 text-center">
        <h1 className="text-lg font-semibold">Nenhuma loja disponível</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Sua conta não possui acesso a nenhuma loja ativa. Peça a um administrador para conceder acesso.
        </p>
      </div>
    )
  }

  return <SessionProvider session={data}>{children}</SessionProvider>
}
