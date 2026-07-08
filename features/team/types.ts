export type MembershipStatus = "ACTIVE" | "INVITED" | "SUSPENDED" | "REVOKED"

export interface TeamMemberListItem {
  membershipId: string
  userId: string
  name: string
  email: string
  avatarUrl: string | null
  membershipStatus: MembershipStatus
  role: { id: string; name: string; displayName: string }
  joinedAt: string | null
  lastLoginAt: string | null
}

export interface TeamMemberDetail {
  membershipId: string
  userId: string
  name: string
  email: string
  membershipStatus: MembershipStatus
  role: { id: string; name: string; displayName: string; permissions: string[] }
  invitedByUserId: string | null
  invitedAt: string | null
  acceptedAt: string | null
}

export interface InviteMemberInput {
  email: string
  name: string
  roleId: string
}

export interface TeamListParams {
  status?: string
  search?: string
}
