import type { Brand, ISODateTime } from "@/types/common"

export type UserId = Brand<string, "UserId">

export enum UserStatus {
  Active = "ACTIVE",
  Inactive = "INACTIVE",
  Invited = "INVITED",
}

/**
 * A User is a human operator of the MarginFlow system.
 * Users are NOT customers — the two concepts are strictly separate.
 *
 * Authorization is handled through Memberships and Roles, not on the User itself.
 * The User record holds only identity data.
 */
export interface User {
  readonly id: UserId
  readonly name: string
  readonly email: string         // globally unique, used for authentication
  readonly phone: string | null
  readonly avatarUrl: string | null
  readonly status: UserStatus
  readonly lastLoginAt: ISODateTime | null
  readonly createdAt: ISODateTime
  readonly updatedAt: ISODateTime
}
