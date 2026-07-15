import "server-only"
import type { NextRequest } from "next/server"
import { prisma } from "@/server/db"
import { authorizationService } from "@/server/services"
import { requireAuth, requireUuidParams } from "@/server/lib"
import { compose, withErrorHandling, withRequestContext, ok } from "@/server/lib/http"
import { AppError } from "@/server/lib/errors"
import { env } from "@/config/env"

interface RouteContext {
  params: Promise<{ storeId: string }>
}

const ALLOWED_TYPES = ["logo", "banner"] as const
type UploadType = (typeof ALLOWED_TYPES)[number]

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

async function handleUpload(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { storeId } = requireUuidParams(await params)
  const actor = requireAuth(request)
  await authorizationService.requirePermission(prisma, actor.userId, storeId, "store:edit")

  const formData = await request.formData()
  const file = formData.get("file")
  const type = formData.get("type") as string | null

  if (!file || !(file instanceof Blob)) {
    throw new AppError({ code: "MISSING_FILE", message: "Nenhum arquivo enviado.", status: 400 })
  }
  if (!type || !(ALLOWED_TYPES as readonly string[]).includes(type)) {
    throw new AppError({ code: "INVALID_TYPE", message: "Tipo inválido. Use 'logo' ou 'banner'.", status: 400 })
  }
  const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const
  if (!(ALLOWED_MIMES as readonly string[]).includes(file.type)) {
    throw new AppError({ code: "INVALID_MIME", message: "Apenas JPEG, PNG, WebP ou GIF são permitidos.", status: 400 })
  }
  if (file.size > MAX_BYTES) {
    throw new AppError({ code: "FILE_TOO_LARGE", message: "Arquivo maior que 5 MB.", status: 413 })
  }

  const timestamp = Date.now()
  const path = `stores/${storeId}/${type as UploadType}-${timestamp}.webp`
  const uploadUrl = `${env.SUPABASE_URL}/storage/v1/object/${path}`

  const buffer = await file.arrayBuffer()
  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Type": "image/webp",
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
    },
    body: buffer,
  })

  if (!uploadRes.ok) {
    const text = await uploadRes.text().catch(() => "")
    throw new AppError({
      code: "UPLOAD_FAILED",
      message: `Falha no upload: ${uploadRes.status} — ${text.slice(0, 200)}`,
      status: 502,
    })
  }

  const publicUrl = `${env.SUPABASE_URL}/storage/v1/object/public/${path}`
  return ok({ url: publicUrl })
}

export const POST = compose(withRequestContext, withErrorHandling)(handleUpload)
