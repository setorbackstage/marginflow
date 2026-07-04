import "server-only"
import { createSign, createVerify } from "node:crypto"
import { env } from "@/config/env"
import { UnauthorizedError } from "../errors"
import { ACCESS_TOKEN_ALGORITHM, ACCESS_TOKEN_TTL_SECONDS } from "./constants"
import type { AccessTokenPayload } from "./types"

/**
 * Hand-rolled RS256 JWT sign/verify using only Node's built-in `crypto` —
 * no external JWT library. API_SPEC.md's JWT Strategy requires exactly
 * RS256 (asymmetric key pair); Node's `createSign`/`createVerify` with
 * "RSA-SHA256" implement that algorithm directly.
 */

function base64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url")
}

function base64urlDecode(input: string): Buffer {
  return Buffer.from(input, "base64url")
}

const HEADER = base64url(JSON.stringify({ alg: ACCESS_TOKEN_ALGORITHM, typ: "JWT" }))

/** Signs a new access token. API_SPEC.md: `sub`, `email`, `iat`, `exp` (15 minutes). */
export function signAccessToken(userId: string, email: string): string {
  const issuedAt = Math.floor(Date.now() / 1000)
  const payload: AccessTokenPayload = {
    sub: userId,
    email,
    iat: issuedAt,
    exp: issuedAt + ACCESS_TOKEN_TTL_SECONDS,
  }

  const signingInput = `${HEADER}.${base64url(JSON.stringify(payload))}`
  const signature = createSign("RSA-SHA256").update(signingInput).end().sign(env.JWT_PRIVATE_KEY)
  return `${signingInput}.${base64url(signature)}`
}

/**
 * Verifies signature and expiration. Throws `ACCESS_TOKEN_INVALID` (401)
 * for a malformed/unverifiable token, `ACCESS_TOKEN_EXPIRED` (401) for an
 * expired one — matching API_SPEC.md's Common Error Codes exactly.
 */
export function verifyAccessToken(token: string): AccessTokenPayload {
  const parts = token.split(".")
  if (parts.length !== 3) {
    throw new UnauthorizedError("ACCESS_TOKEN_INVALID", "JWT signature is invalid.")
  }
  const [encodedHeader, encodedPayload, encodedSignature] = parts
  const signingInput = `${encodedHeader}.${encodedPayload}`

  let isValidSignature: boolean
  try {
    isValidSignature = createVerify("RSA-SHA256")
      .update(signingInput)
      .end()
      .verify(env.JWT_PUBLIC_KEY, base64urlDecode(encodedSignature))
  } catch {
    throw new UnauthorizedError("ACCESS_TOKEN_INVALID", "JWT signature is invalid.")
  }
  if (!isValidSignature) {
    throw new UnauthorizedError("ACCESS_TOKEN_INVALID", "JWT signature is invalid.")
  }

  let payload: AccessTokenPayload
  try {
    payload = JSON.parse(base64urlDecode(encodedPayload).toString("utf8"))
  } catch {
    throw new UnauthorizedError("ACCESS_TOKEN_INVALID", "JWT signature is invalid.")
  }

  const now = Math.floor(Date.now() / 1000)
  if (typeof payload.exp !== "number" || payload.exp <= now) {
    throw new UnauthorizedError("ACCESS_TOKEN_EXPIRED", "JWT has expired. Refresh required.")
  }

  return payload
}
