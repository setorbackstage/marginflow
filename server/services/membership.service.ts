import "server-only"
import { createHash } from "crypto"
import type { DbClient } from "../db"
import type { Membership, Role, User } from "../../generated/prisma/client"
import { membershipRepository, roleRepository, userRepository, invitationTokenRepository } from "../repositories"
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "../lib/errors"
import { eventBus, createEvent } from "../lib/events"
import { authorizationService } from "./authorization.service"

const INVITATION_TTL_HOURS = 72

export interface TeamMember {
  membership: Membership
  user: User
  role: Role
}

export interface InviteMemberInput {
  email: string
  name: string
  roleId: string
}

async function requireRoleAtStore(db: DbClient, roleId: string, storeId: string): Promise<Role> {
  const role = await roleRepository.findById(db, roleId)
  if (!role || role.storeId !== storeId) {
    throw new BadRequestError("ROLE_NOT_FOUND", "Role does not belong to this store.")
  }
  return role
}

export const membershipService = {
  /** `GET /stores/:storeId/team` */
  async listTeam(db: DbClient, storeId: string): Promise<TeamMember[]> {
    const memberships = await membershipRepository.findManyByStore(db, storeId)
    return Promise.all(
      memberships.map(async (membership) => {
        const [user, role] = await Promise.all([
          userRepository.findById(db, membership.userId),
          roleRepository.findById(db, membership.roleId),
        ])
        if (!user || !role) throw new NotFoundError("MEMBERSHIP_NOT_FOUND", "Membership references missing data.")
        return { membership, user, role }
      }),
    )
  },

  /** `GET /stores/:storeId/team/:userId` */
  async getTeamMember(db: DbClient, storeId: string, userId: string): Promise<TeamMember> {
    const membership = await membershipRepository.findByUserAndStore(db, userId, storeId)
    if (!membership) throw new NotFoundError("MEMBERSHIP_NOT_FOUND", "This user is not a member of this store.")
    const [user, role] = await Promise.all([
      userRepository.findById(db, userId),
      roleRepository.findById(db, membership.roleId),
    ])
    if (!user || !role) throw new NotFoundError("MEMBERSHIP_NOT_FOUND", "Membership references missing data.")
    return { membership, user, role }
  },

  /**
   * `POST /stores/:storeId/team/invite`. Finds or creates the invited User,
   * then creates (or, if previously INVITED/SUSPENDED/REVOKED, reactivates)
   * their Membership — DATA_MODEL.md's `(user_id, store_id)` uniqueness
   * means there is only ever one Membership row per pair, so re-inviting
   * necessarily updates it rather than inserting a second row.
   */
  async inviteMember(
    db: DbClient,
    storeId: string,
    storeName: string,
    input: InviteMemberInput,
    invitedByUserId: string | null,
  ): Promise<Membership> {
    const role = await requireRoleAtStore(db, input.roleId, storeId)
    if (role.name === "OWNER") {
      throw new BadRequestError("CANNOT_ASSIGN_OWNER_ROLE", "The OWNER role cannot be assigned via invitation.")
    }

    let user = await userRepository.findByEmail(db, input.email)
    if (!user) {
      user = await userRepository.create(db, { name: input.name, email: input.email, status: "INVITED" })
    }

    const existing = await membershipRepository.findByUserAndStore(db, user.id, storeId)
    const now = new Date()

    let membership: Membership
    if (existing) {
      if (existing.status === "ACTIVE") {
        throw new ConflictError("USER_ALREADY_MEMBER", "This email already has an active membership at this store.")
      }
      membership = await membershipRepository.update(db, existing.id, {
        role: { connect: { id: role.id } },
        status: "INVITED",
        invitedByUser: invitedByUserId ? { connect: { id: invitedByUserId } } : { disconnect: true },
        invitedAt: now,
      })
    } else {
      membership = await membershipRepository.create(db, {
        user: { connect: { id: user.id } },
        store: { connect: { id: storeId } },
        role: { connect: { id: role.id } },
        status: "INVITED",
        invitedByUser: invitedByUserId ? { connect: { id: invitedByUserId } } : undefined,
        invitedAt: now,
      })
    }

    const expiresAt = new Date(now.getTime() + INVITATION_TTL_HOURS * 60 * 60 * 1000)

    // Revoke any previous active invitation tokens for this membership
    await invitationTokenRepository.revokeAllForMembership(db, membership.id)

    // Generate and persist the invitation token
    const rawInvitationToken = crypto.randomUUID()
    const tokenHash = createHash("sha256").update(rawInvitationToken).digest("hex")
    await invitationTokenRepository.create(db, {
      membership: { connect: { id: membership.id } },
      tokenHash,
      expiresAt,
    })

    await eventBus.publish(
      createEvent("membership.invited", storeId, invitedByUserId, {
        membershipId: membership.id,
        storeId,
        storeName,
        invitedEmail: input.email,
        invitedName: input.name,
        roleName: role.name,
        invitedByUserId,
        invitationToken: rawInvitationToken,
        expiresAt: expiresAt.toISOString(),
      }),
      db,
    )

    return membership
  },

  /**
   * `PATCH /stores/:storeId/team/:userId/role`. A user cannot change their
   * own role; only an OWNER may assign or remove the OWNER role.
   */
  async changeRole(
    db: DbClient,
    storeId: string,
    targetUserId: string,
    newRoleId: string,
    actorUserId: string,
  ): Promise<Membership> {
    if (actorUserId === targetUserId) {
      throw new ConflictError("CANNOT_CHANGE_OWN_ROLE", "A user cannot change their own role.")
    }

    const membership = await membershipRepository.findByUserAndStore(db, targetUserId, storeId)
    if (!membership) throw new NotFoundError("MEMBERSHIP_NOT_FOUND", "This user is not a member of this store.")

    const [currentRole, newRole, actorRole] = await Promise.all([
      roleRepository.findById(db, membership.roleId),
      requireRoleAtStore(db, newRoleId, storeId),
      authorizationService.getActiveRole(db, actorUserId, storeId),
    ])

    const touchesOwner = currentRole?.name === "OWNER" || newRole.name === "OWNER"
    if (touchesOwner && actorRole?.name !== "OWNER") {
      throw new ForbiddenError("INSUFFICIENT_PERMISSIONS", "Only an OWNER may assign or remove the OWNER role.")
    }

    return membershipRepository.update(db, membership.id, { role: { connect: { id: newRole.id } } })
  },

  /**
   * `DELETE /stores/:storeId/team/:userId` — revokes access; the User
   * record and membership history are preserved (status → REVOKED).
   */
  async revoke(db: DbClient, storeId: string, targetUserId: string, actorUserId: string): Promise<Membership> {
    if (actorUserId === targetUserId) {
      throw new ConflictError("CANNOT_REMOVE_SELF", "A user cannot revoke their own membership.")
    }

    const membership = await membershipRepository.findByUserAndStore(db, targetUserId, storeId)
    if (!membership) throw new NotFoundError("MEMBERSHIP_NOT_FOUND", "This user is not a member of this store.")

    const role = await roleRepository.findById(db, membership.roleId)
    if (role?.name === "OWNER") {
      const allMemberships = await membershipRepository.findManyByStore(db, storeId)
      const ownerFlags = await Promise.all(
        allMemberships
          .filter((m) => m.status === "ACTIVE")
          .map(async (m) => (await roleRepository.findById(db, m.roleId))?.name === "OWNER"),
      )
      const activeOwnerCount = ownerFlags.filter(Boolean).length
      if (activeOwnerCount <= 1) {
        throw new ConflictError("CANNOT_REMOVE_LAST_OWNER", "The store must always have at least one active owner.")
      }
    }

    return membershipRepository.update(db, membership.id, { status: "REVOKED", revokedAt: new Date() })
  },
}
