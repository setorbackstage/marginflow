"use client"

import Image from "next/image"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2, ArrowLeft } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { useResetPassword } from "@/features/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const schema = z.object({
  password: z.string().min(8, "Mínimo 8 caracteres"),
  passwordConfirm: z.string(),
}).refine((d) => d.password === d.passwordConfirm, {
  message: "As senhas não coincidem",
  path: ["passwordConfirm"],
})
type FormData = z.infer<typeof schema>

export default function ResetPasswordPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token") ?? ""
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) })
  const resetPassword = useResetPassword()

  const onSubmit = handleSubmit((data) => {
    resetPassword.mutate({ token, password: data.password })
  })

  if (!token) {
    return (
      <div className="flex min-h-svh items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">Link inválido. <Link href="/forgot-password" className="underline">Solicite um novo.</Link></p>
      </div>
    )
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Image src="/logo-full.png" alt="MarginFlow OS" width={220} height={56} className="dark:invert" priority />
          <p className="text-sm text-muted-foreground">Redefinir senha</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Nova senha</CardTitle>
            <CardDescription>Defina uma nova senha para sua conta.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="password">Nova senha</Label>
                <Input id="password" type="password" autoComplete="new-password" aria-invalid={!!errors.password} {...register("password")} />
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="passwordConfirm">Confirmar senha</Label>
                <Input id="passwordConfirm" type="password" autoComplete="new-password" aria-invalid={!!errors.passwordConfirm} {...register("passwordConfirm")} />
                {errors.passwordConfirm && <p className="text-xs text-destructive">{errors.passwordConfirm.message}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={resetPassword.isPending}>
                {resetPassword.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                Redefinir senha
              </Button>
            </form>
          </CardContent>
        </Card>
        <p className="text-center text-sm">
          <Link href="/login" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-3" /> Voltar para o login
          </Link>
        </p>
      </div>
    </div>
  )
}
