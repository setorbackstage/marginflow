"use client"

import * as React from "react"
import { UserPlus, MoreHorizontal, Users } from "lucide-react"

import { useAuth, useCan } from "@/features/auth"
import { useRoles } from "@/features/stores"
import { useTeam, useChangeMemberRole, useRevokeMember } from "@/features/team/hooks"
import { MEMBERSHIP_STATUS_CONFIG } from "@/features/team/status"
import type { TeamMemberListItem } from "@/features/team/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { EmptyState, ErrorState, StatusBadge, SearchBar, ConfirmDialog } from "@/components/shared"
import { formatDateTime } from "@/lib/format"
import { useDebouncedValue } from "@/hooks"
import { InviteMemberDialog } from "./invite-member-dialog"

export function TeamSection() {
  const { session } = useAuth()
  const canView = useCan("users:view")
  const canInvite = useCan("users:invite")
  const canEdit = useCan("users:edit")
  const canRemove = useCan("users:remove")

  const [searchInput, setSearchInput] = React.useState("")
  const search = useDebouncedValue(searchInput)
  const team = useTeam({ search: search || undefined })
  const roles = useRoles()
  const changeRole = useChangeMemberRole()
  const revoke = useRevokeMember()

  const [inviteOpen, setInviteOpen] = React.useState(false)
  const [revokeTarget, setRevokeTarget] = React.useState<TeamMemberListItem | null>(null)

  const assignableRoles = (roles.data ?? []).filter((r) => r.name !== "OWNER")

  if (!canView) return null

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-sm">Equipe</CardTitle>
          <CardDescription>Perfis definem o que cada pessoa pode fazer na loja.</CardDescription>
        </div>
        {canInvite ? (
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            <UserPlus data-icon="inline-start" />
            Convidar membro
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        <SearchBar value={searchInput} onChange={setSearchInput} placeholder="Buscar por nome ou e-mail..." />

        {team.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : team.isError ? (
          <ErrorState error={team.error} onRetry={() => team.refetch()} />
        ) : team.data && team.data.length > 0 ? (
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Membro</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Último acesso</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {team.data.map((member) => {
                  const isSelf = member.userId === session.user.id
                  const isOwnerRole = member.role.name === "OWNER"
                  return (
                    <TableRow key={member.membershipId}>
                      <TableCell>
                        <p className="font-medium">
                          {member.name}
                          {isSelf ? <span className="ml-1.5 text-xs text-muted-foreground">(você)</span> : null}
                        </p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </TableCell>
                      <TableCell>
                        {canEdit && !isSelf && !isOwnerRole ? (
                          <Select
                            value={member.role.id}
                            onValueChange={(roleId) => roleId && changeRole.mutate({ userId: member.userId, roleId })}
                            items={assignableRoles.map((r) => ({ value: r.id, label: r.displayName }))}
                          >
                            <SelectTrigger className="w-40" size="sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {assignableRoles.map((role) => (
                                <SelectItem key={role.id} value={role.id}>
                                  {role.displayName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-sm">{member.role.displayName}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={member.membershipStatus} config={MEMBERSHIP_STATUS_CONFIG} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {member.lastLoginAt ? formatDateTime(member.lastLoginAt) : "Nunca"}
                      </TableCell>
                      <TableCell>
                        {canRemove && !isSelf ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Ações do membro" />}>
                              <MoreHorizontal />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem variant="destructive" onClick={() => setRevokeTarget(member)}>
                                Revogar acesso
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <EmptyState
            icon={Users}
            title="Nenhum membro encontrado"
            description={search ? "Ajuste a busca." : "Convide alguém para começar a montar sua equipe."}
            action={
              canInvite && !search ? (
                <Button size="sm" onClick={() => setInviteOpen(true)}>
                  <UserPlus data-icon="inline-start" />
                  Convidar membro
                </Button>
              ) : undefined
            }
          />
        )}
      </CardContent>

      <InviteMemberDialog open={inviteOpen} onOpenChange={setInviteOpen} roles={assignableRoles} />

      <ConfirmDialog
        open={!!revokeTarget}
        onOpenChange={(o) => !o && setRevokeTarget(null)}
        title="Revogar acesso"
        description={`Tem certeza que deseja revogar o acesso de "${revokeTarget?.name}"? A pessoa deixará de conseguir entrar nesta loja.`}
        confirmLabel="Revogar"
        variant="destructive"
        isLoading={revoke.isPending}
        onConfirm={() => {
          if (!revokeTarget) return
          revoke.mutate(revokeTarget.userId, { onSuccess: () => setRevokeTarget(null) })
        }}
      />
    </Card>
  )
}
