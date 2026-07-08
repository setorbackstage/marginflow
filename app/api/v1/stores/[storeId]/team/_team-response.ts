import "server-only"
import type { TeamMember } from "@/server/services"

/** API_SPEC.md `GET /team` list-item shape. */
export function toTeamMemberListItem({ membership, user, role }: TeamMember) {
  return {
    membershipId: membership.id,
    userId: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    membershipStatus: membership.status,
    role: { id: role.id, name: role.name, displayName: role.displayName },
    joinedAt: membership.acceptedAt,
    lastLoginAt: user.lastLoginAt,
  }
}

/** API_SPEC.md `GET /team/:userId` detail shape — includes the role's permissions. */
export function toTeamMemberDetail({ membership, user, role }: TeamMember) {
  return {
    membershipId: membership.id,
    userId: user.id,
    name: user.name,
    email: user.email,
    membershipStatus: membership.status,
    role: { id: role.id, name: role.name, displayName: role.displayName, permissions: role.permissions },
    invitedByUserId: membership.invitedByUserId,
    invitedAt: membership.invitedAt,
    acceptedAt: membership.acceptedAt,
  }
}
