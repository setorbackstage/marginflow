/** API_SPEC.md — JWT Strategy: Access Token payload shape. */
export interface AccessTokenPayload {
  sub: string
  email: string
  iat: number
  exp: number
}

/** The authenticated actor derived from a verified access token. */
export interface AuthenticatedActor {
  userId: string
  email: string
}
