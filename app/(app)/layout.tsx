import type { ReactNode } from "react"
import { AuthGuard } from "@/features/auth"
import { AppShellLayout } from "@/components/app-shell/app-shell-layout"

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <AppShellLayout>{children}</AppShellLayout>
    </AuthGuard>
  )
}
