"use client"

import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Loader2, UtensilsCrossed } from "lucide-react"

import { useLogin } from "@/features/auth"
import { isApiError } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const loginSchema = z.object({
  email: z.string().min(1, "Informe o e-mail").email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
})

type LoginValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const login = useLogin()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  const onSubmit = handleSubmit((values) => {
    login.mutate(values, {
      onError: (error) => {
        const message = isApiError(error)
          ? error.code === "INVALID_CREDENTIALS"
            ? "E-mail ou senha inválidos."
            : error.message
          : "Não foi possível entrar. Tente novamente."
        toast.error(message)
      },
    })
  })

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <UtensilsCrossed className="size-5" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">MarginFlow OS</h1>
          <p className="text-sm text-muted-foreground">O sistema operacional do seu restaurante</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Entrar</CardTitle>
            <CardDescription>Acesse o painel da sua loja</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="voce@restaurante.com"
                  aria-invalid={!!errors.email}
                  {...register("email")}
                />
                {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  aria-invalid={!!errors.password}
                  {...register("password")}
                />
                {errors.password ? <p className="text-xs text-destructive">{errors.password.message}</p> : null}
              </div>

              <Button type="submit" className="w-full" disabled={login.isPending}>
                {login.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                Entrar
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Ainda não tem uma conta?{" "}
          <Link href="/signup" className="font-medium text-foreground underline underline-offset-4">
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  )
}
