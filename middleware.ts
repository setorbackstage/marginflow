import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * Edge middleware — primeira linha de defesa para rotas protegidas.
 *
 * Lógica: se o cookie `mf_refresh_token` não estiver presente, redireciona
 * para /login antes de carregar qualquer JavaScript da aplicação.
 *
 * Nota: esta verificação é de presença apenas (o Edge runtime não acessa
 * a chave RSA para validar o JWT). A validação criptográfica real acontece
 * nos handlers de API via `requireAuth()`. O middleware elimina o "flicker"
 * em que a UI carrega e depois redireciona no cliente.
 */

/** Rotas públicas que não exigem autenticação. */
const PUBLIC_PREFIXES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/accept-invitation",
  "/r/",       // cardápio público (/r/[slug])
  "/docs",     // API docs
]

const COOKIE_NAME = "mf_refresh_token"

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl

  // Deixa passar: APIs (autenticam por si mesmas), assets estáticos e rotas públicas
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  ) {
    return NextResponse.next()
  }

  // Verifica presença do cookie de sessão
  if (!request.cookies.has(COOKIE_NAME)) {
    const loginUrl = new URL("/login", request.url)
    // Preserva a URL de destino para redirecionar após o login
    if (pathname !== "/" && pathname !== "/login") {
      loginUrl.searchParams.set("next", pathname)
    }
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  /**
   * Executa em todos os caminhos exceto arquivos estáticos conhecidos.
   * Os prefixos `/_next/static`, `/_next/image` e arquivos com extensão
   * são excluídos para não impactar performance de assets.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|icon\\.png|manifest\\.webmanifest|openapi\\.yaml).*)",
  ],
}
