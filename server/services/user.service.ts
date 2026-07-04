import "server-only"
import { userRepository } from "../repositories"

/** Thin read-only accessor — User has no business rules of its own beyond what Membership/Role already enforce. */
export const userService = {
  findById: userRepository.findById,
}
