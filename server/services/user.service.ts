import "server-only"
import { userRepository } from "../repositories"
import { hashPassword, verifyPassword } from "../lib"
import { UnauthorizedError } from "../lib/errors"
import type { DbClient } from "../db"

export const userService = {
  findById: userRepository.findById,

  async updateProfile(db: DbClient, userId: string, patch: { name?: string; phone?: string | null }) {
    return userRepository.update(db, userId, patch)
  },

  async changePassword(db: DbClient, userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await userRepository.findById(db, userId)
    if (!user || !user.passwordHash) {
      throw new UnauthorizedError("INVALID_CREDENTIALS", "Senha atual incorreta.")
    }
    const valid = await verifyPassword(currentPassword, user.passwordHash)
    if (!valid) {
      throw new UnauthorizedError("INVALID_CREDENTIALS", "Senha atual incorreta.")
    }
    const passwordHash = await hashPassword(newPassword)
    await userRepository.update(db, userId, { passwordHash })
  },
}
