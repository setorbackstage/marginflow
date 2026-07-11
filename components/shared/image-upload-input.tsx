"use client"

import * as React from "react"
import { Upload, X, ImageIcon } from "lucide-react"
import { getAccessToken } from "@/lib/api/token-store"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface ImageUploadInputProps {
  storeId: string
  type: "logo" | "banner"
  value: string | null
  onChange: (url: string | null) => void
  disabled?: boolean
}

/** Max dimension in pixels per upload type. */
const MAX_PX: Record<"logo" | "banner", number> = { logo: 400, banner: 1920 }

/** Converts a File to a resized WEBP Blob using the Canvas API (no external libs). */
async function toWebp(file: File, type: "logo" | "banner"): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const maxPx = MAX_PX[type]

  let w = bitmap.width
  let h = bitmap.height
  if (w > maxPx) {
    h = Math.round((h * maxPx) / w)
    w = maxPx
  }

  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d")!
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob falhou"))),
      "image/webp",
      0.85,
    )
  })
}

export function ImageUploadInput({ storeId, type, value, onChange, disabled }: ImageUploadInputProps) {
  const [isDragging, setIsDragging] = React.useState(false)
  const [isUploading, setIsUploading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const label = type === "logo" ? "logo" : "banner"
  const aspectClass = type === "logo" ? "aspect-square max-w-[120px]" : "aspect-[16/5] w-full"

  async function processFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Apenas imagens são aceitas.")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Arquivo maior que 5 MB.")
      return
    }
    setError(null)
    setIsUploading(true)
    try {
      const webpBlob = await toWebp(file, type)
      const fd = new FormData()
      fd.append("file", webpBlob, `${type}.webp`)
      fd.append("type", type)

      const token = getAccessToken()
      const res = await fetch(`/api/v1/stores/${storeId}/upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
        body: fd,
      })

      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
        throw new Error(json?.error?.message ?? `Erro ${res.status}`)
      }

      const json = (await res.json()) as { data?: { url?: string } }
      const url = json?.data?.url
      if (!url) throw new Error("URL não retornada pelo servidor.")
      onChange(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no upload.")
    } finally {
      setIsUploading(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ""
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave() {
    setIsDragging(false)
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        disabled={disabled || isUploading}
        onChange={handleFileChange}
      />

      {/* Preview or drop zone */}
      <div
        className={cn(
          "relative overflow-hidden rounded-md border bg-muted transition-colors",
          aspectClass,
          !disabled && !isUploading && "cursor-pointer hover:border-primary/60",
          isDragging && "border-primary bg-primary/5",
        )}
        onClick={() => !disabled && !isUploading && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt={`Preview do ${label}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1.5 p-3 text-muted-foreground">
            <ImageIcon className="size-6 opacity-50" />
            <span className="text-center text-xs leading-tight">
              {isUploading ? "Enviando…" : `Arraste uma imagem ou clique para selecionar`}
            </span>
          </div>
        )}

        {/* Uploading overlay */}
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2">
              <Upload className="size-5 animate-bounce text-primary" />
              <span className="text-xs text-muted-foreground">Enviando…</span>
            </div>
          </div>
        )}

        {/* Remove button */}
        {value && !disabled && !isUploading && (
          <button
            type="button"
            className="absolute right-1 top-1 rounded-full bg-background/80 p-0.5 text-muted-foreground shadow hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation()
              onChange(null)
            }}
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* Action row */}
      {!disabled && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 px-3 text-xs"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="mr-1.5 size-3" />
          {value ? "Trocar imagem" : "Enviar imagem"}
        </Button>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
