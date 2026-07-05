/**
 * In-memory access-token store. The access token (RS256 JWT) is short-lived
 * and is returned in the JSON body of `POST /auth/login` and
 * `POST /auth/refresh` — never a cookie. Keeping it in memory (not
 * localStorage) avoids XSS token theft; on a full page reload it is
 * re-obtained via `POST /auth/refresh`, which relies on the httpOnly
 * `mf_refresh_token` cookie the backend manages.
 */
let accessToken: string | null = null

export function getAccessToken(): string | null {
  return accessToken
}

export function setAccessToken(token: string | null): void {
  accessToken = token
}

export function clearAccessToken(): void {
  accessToken = null
}
