import "server-only"

/**
 * Envio de e-mails transacionais via Resend.
 * Usa a Resend REST API diretamente (sem SDK externo) para evitar dependências extras.
 * A chave RESEND_API_KEY deve estar configurada nas env vars da Vercel.
 */

const RESEND_API_URL = "https://api.resend.com/emails"

export interface SendEmailInput {
  to: string | string[]
  subject: string
  html: string
  text?: string
  from?: string
  replyTo?: string
}

export interface SendEmailResult {
  id: string | null
  ok: boolean
  error?: string
}

const DEFAULT_FROM = process.env.MAIL_FROM ?? "MarginFlow <no-reply@marginflow.app>"

export interface PasswordResetEmailData {
  userName: string
  resetUrl: string
  expiresInMinutes: number
}

export interface InvitationEmailData {
  invitedName: string
  storeName: string
  roleName: string
  inviteUrl: string
  expiresAt: Date | string
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY não configurada — e-mail não enviado")
    return { id: null, ok: false, error: "RESEND_API_KEY ausente" }
  }

  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: input.from ?? DEFAULT_FROM,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        reply_to: input.replyTo,
      }),
    })

    const data = (await res.json().catch(() => ({}))) as {
      id?: string
      message?: string
    }

    if (!res.ok) {
      console.error("[email] falha Resend:", res.status, data)
      return { id: null, ok: false, error: data.message ?? `HTTP ${res.status}` }
    }

    return { id: data.id ?? null, ok: true }
  } catch (err) {
    console.error("[email] erro inesperado:", err)
    return { id: null, ok: false, error: String(err) }
  }
}

/* ---------- Templates ---------- */

export function welcomeEmail(name: string, storeName: string): { subject: string; html: string; text: string } {
  return {
    subject: `Bem-vindo ao MarginFlow OS — ${storeName}`,
    text: `Olá ${name},\n\nSua loja "${storeName}" foi criada com sucesso no MarginFlow OS.\nAcesse o painel e comece a gerenciar seus pedidos, cozinha e entregas.\n\nAbraços,\nEquipe MarginFlow`,
    html: `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1a1a1a">
        <h1 style="color:#0e9f6e;margin-bottom:8px">Bem-vindo ao MarginFlow OS</h1>
        <p>Olá <strong>${name}</strong>,</p>
        <p>Sua loja <strong>${storeName}</strong> foi criada com sucesso.</p>
        <p>Acesse o painel e comece a gerenciar pedidos, cozinha, entregas e muito mais.</p>
        <p style="margin-top:24px">Abraços,<br><strong>Equipe MarginFlow</strong></p>
      </div>`,
  }
}

/** Assinatura esperada por password-auth.service.ts */
export function passwordResetTemplate(input: {
  userName: string
  resetUrl: string
  expiresInMinutes: number
}): { subject: string; html: string; text: string } {
  const { userName, resetUrl, expiresInMinutes } = input
  return {
    subject: "Redefinir senha — MarginFlow OS",
    text: `Olá ${userName},\n\nRecebemos um pedido para redefinir sua senha. Clique no link abaixo (válido por ${expiresInMinutes} minutos):\n${resetUrl}\n\nSe não foi você, ignore este e-mail.`,
    html: `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1a1a1a">
        <h1 style="color:#0e9f6e">Redefinir senha</h1>
        <p>Olá <strong>${userName}</strong>,</p>
        <p>Recebemos um pedido para redefinir sua senha. Clique no botão abaixo (válido por ${expiresInMinutes} minutos):</p>
        <p style="margin:24px 0">
          <a href="${resetUrl}" style="background:#0e9f6e;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Redefinir senha</a>
        </p>
        <p style="color:#666;font-size:13px">Se não foi você, ignore este e-mail.</p>
      </div>`,
  }
}

/** Assinatura esperada por notification.service.ts */
export function invitationTemplate(input: {
  invitedName: string
  storeName: string
  roleName: string
  inviteUrl: string
  expiresAt: Date | string
}): { subject: string; html: string; text: string } {
  const { invitedName, storeName, roleName, inviteUrl } = input
  return {
    subject: `Você foi convidado para ${storeName} no MarginFlow OS`,
    text: `${invitedName}, você foi convidado(a) para participar da loja "${storeName}" como ${roleName}.\nAcesse: ${inviteUrl}`,
    html: `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1a1a1a">
        <h1 style="color:#0e9f6e">Convite para o MarginFlow OS</h1>
        <p><strong>${invitedName}</strong>, você foi convidado(a) para participar da loja <strong>${storeName}</strong> como <strong>${roleName}</strong>.</p>
        <p style="margin:24px 0">
          <a href="${inviteUrl}" style="background:#0e9f6e;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Aceitar convite</a>
        </p>
      </div>`,
  }
}
