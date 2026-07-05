import { z } from "zod"
import { MIN_PASSWORD_LENGTH } from "./constants"

/** `POST /auth/login` */
export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1, "Password is required."),
})
export type LoginInput = z.infer<typeof loginSchema>

/** `POST /auth/signup` */
export const signupSchema = z.object({
  storeName: z.string().min(2, "Store name must be at least 2 characters."),
  ownerName: z.string().min(2, "Name must be at least 2 characters."),
  email: z.email(),
  password: z.string().min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`),
  phone: z.string().min(8, "Phone must be at least 8 characters."),
  storeType: z.enum(["RESTAURANT", "DARK_KITCHEN", "CAFE", "BAR", "PIZZERIA", "BURGER_SHOP", "FRANCHISE_UNIT"]),
})
export type SignupInput = z.infer<typeof signupSchema>

/** `POST /auth/forgot-password` */
export const forgotPasswordSchema = z.object({
  email: z.email(),
})
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>

/** `POST /auth/reset-password` */
export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Token is required."),
    password: z.string().min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`),
    passwordConfirmation: z.string().min(1, "Password confirmation is required."),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: "Passwords do not match.",
    path: ["passwordConfirmation"],
  })
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

/** `POST /auth/accept-invitation` */
export const acceptInvitationSchema = z.object({
  token: z.string().min(1, "Token is required."),
  name: z.string().min(2, "Name must be at least 2 characters."),
  password: z.string().min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`),
})
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>
