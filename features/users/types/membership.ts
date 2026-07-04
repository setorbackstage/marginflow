import type { Brand, ISODateTime } from "@/types/common"
import type { StoreId } from "@/features/stores/types"
import type { UserId } from "./user"
import type { RoleId } from "./role"

export type MembershipId = Brand<string, "MembershipId">

export enum MembershipStatus {
  Active = "ACTIVE",
  Invited = "INVITED",   // user has not yet accepted the invitation
  Suspended = "SUSPENDED",
  Revoked = "REVOKED",
}

/**
 * Membership is the join between a User, a Store, and a Role.
 * It answers the question: "what can this user do in this store?"
 *
 * A user may have multiple Memberships — one per Store they belong to.
 * Changing a user's role means updating their Membership, not their User record.
 */
export interface Membership {
  readonly id: MembershipId
  readonly userId: UserId
  readonly storeId: StoreId
  readonly roleId: RoleId
  readonly status: MembershipStatus
  readonly invitedByUserId: UserId | null
  readonly invitedAt: ISODateTime | null
  readonly acceptedAt: ISODateTime | null
  readonly revokedAt: ISODateTime | null
  readonly createdAt: ISODateTime
  readonly updatedAt: ISODateTime
}
