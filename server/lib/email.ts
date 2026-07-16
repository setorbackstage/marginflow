import "server-only"
import { Resend } from "resend"
import { env } from "@/config/env"
import { logger } from "./logger"

// ---------------------------------------------------------------------------
// Cliente
// ---------------------------------------------------------------------------

let _resend: Resend | null = null

function getResend(): Resend | null {
  if (!env.RESEND_API_KEY) return null
  if (!_resend) _resend = new Resend(env.RESEND_API_KEY)
  return _resend
}

// ---------------------------------------------------------------------------
// Send helper — loga em desenvolvimento, envia em produção.
// Nunca lança — falhas de e-mail nunca devem bloquear a operação principal.
// ---------------------------------------------------------------------------

interface SendOptions {
  to: string | string[]
  subject: string
  html: string
  replyTo?: string
}

export async function sendEmail(opts: SendOptions): Promise<void> {
  const resend = getResend()

  if (!resend) {
    // Dev fallback — exibe o e-mail no console para que possamos testar
    // sem precisar de uma conta Resend.
    logger.info("email.send.dev_fallback", {
      to: opts.to,
      subject: opts.subject,
      note: "Configure RESEND_API_KEY para enviar e-mails reais.",
    })
    return
  }

  const { error } = await resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    ...(opts.replyTo ? { replyTo: opts.replyTo } : {}),
  })

  if (error) {
    logger.error("email.send.failed", { to: opts.to, subject: opts.subject, error })
  } else {
    logger.info("email.send.ok", { to: opts.to, subject: opts.subject })
  }
}

// ---------------------------------------------------------------------------
// Templates HTML
// ---------------------------------------------------------------------------

const APP_NAME = "MarginFlow OS"
const BRAND_COLOR = "#6366f1"

/** Wrapper base de todos os e-mails — reforça branding consistente. */
function baseTemplate(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">
          <!-- Header -->
          <tr>
            <td style="background:${BRAND_COLOR};padding:28px 40px;">
              <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.5px;">${APP_NAME}</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#6b7280;font-size:12px;line-height:1.5;">
                Este e-mail foi enviado pelo ${APP_NAME}. Se você não solicitou esta ação, ignore esta mensagem.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:${BRAND_COLOR};color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:15px;font-weight:600;margin:24px 0;">${label}</a>`
}

function fallbackLink(href: string): string {
  return `<p style="margin:16px 0 0;font-size:13px;color:#6b7280;">
    Se o botão não funcionar, copie e cole este link no navegador:<br/>
    <a href="${href}" style="color:${BRAND_COLOR};word-break:break-all;">${href}</a>
  </p>`
}

// ---------------------------------------------------------------------------
// Templates concretos
// ---------------------------------------------------------------------------

export interface PasswordResetEmailData {
  userName: string
  resetUrl: string
  expiresInMinutes: number
}

export function passwordResetTemplate({ userName, resetUrl, expiresInMinutes }: PasswordResetEmailData): string {
  const firstName = userName.split(" ")[0]
  return baseTemplate(
    "Redefinição de senha — " + APP_NAME,
    `<h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Redefinir sua senha</h1>
    <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
      Olá, ${firstName}! Recebemos uma solicitação para redefinir a senha da sua conta no ${APP_NAME}.
    </p>
    ${button(resetUrl, "Redefinir senha")}
    <p style="margin:16px 0 0;font-size:14px;color:#6b7280;line-height:1.5;">
      Este link expira em <strong>${expiresInMinutes} minutos</strong>. Após isso, você precisará solicitar um novo link.
    </p>
    ${fallbackLink(resetUrl)}`,
  )
}

export interface InvitationEmailData {
  invitedName: string
  storeName: string
  roleName: string
  invitedByName?: string
  inviteUrl: string
  expiresAt: string
}

const ROLE_LABEL: Record<string, string> = {
  OWNER: "Proprietário",
  MANAGER: "Gerente",
  CASHIER: "Caixa",
  KITCHEN_ATTENDANT: "Cozinheiro",
  DELIVERY_COORDINATOR: "Entregador",
  ANALYST: "Analista",
}

export function invitationTemplate({ invitedName, storeName, roleName, invitedByName, inviteUrl, expiresAt }: InvitationEmailData): string {
  const firstName = invitedName.split(" ")[0]
  const roleLabel = ROLE_LABEL[roleName] ?? roleName
  const expDate = new Date(expiresAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
  const byLine = invitedByName ? ` por <strong>${invitedByName}</strong>` : ""

  return baseTemplate(
    `Convite para ${storeName} — ${APP_NAME}`,
    `<h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Você foi convidado!</h1>
    <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
      Olá, ${firstName}! Você foi convidado${byLine} para fazer parte da equipe de
      <strong>${storeName}</strong> no ${APP_NAME} com o papel de <strong>${roleLabel}</strong>.
    </p>
    <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
      Clique no botão abaixo para criar sua senha e começar a usar o sistema:
    </p>
    ${button(inviteUrl, "Aceitar convite")}
    <p style="margin:16px 0 0;font-size:14px;color:#6b7280;line-height:1.5;">
      Este convite expira em <strong>${expDate}</strong>.
    </p>
    ${fallbackLink(inviteUrl)}`,
  )
}
