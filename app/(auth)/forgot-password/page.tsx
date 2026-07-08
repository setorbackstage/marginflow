"use client"

import Image from "next/image"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2, ArrowLeft } from "lucide-react"
import { useForgotPassword } from "@/features/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

const schema = z.object({ email: z.string().email("E-mail inválido") })
type FormData = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) })
  const forgotPassword = useForgotPassword()

  const onSubmit = handleSubmit((data) => {
    forgotPassword.mutate(data, {
      onSuccess: () => toast.success("Se esse e-mail estiver cadastrado, você receberá as instruções em breve."),
    })
  })

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Image src="/logo-full.png" alt="MarginFlow OS" width={220} height={56} className="dark:invert" priority />
          <p className="text-sm text-muted-foreground">Recuperação de senha</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Esqueceu a senha?</CardTitle>
            <CardDescription>Informe seu e-mail e enviaremos as instruções de recuperação.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" autoComplete="email" placeholder="voce@restaurante.com" aria-invalid={!!errors.email} {...register("email")} />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={forgotPassword.isPending}>
                {forgotPassword.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                Enviar instruções
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
