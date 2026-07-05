"use client"

import Link from "next/link"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Loader2, UtensilsCrossed } from "lucide-react"

import { useSignup, type StoreType } from "@/features/auth"
import { isApiError } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldLabel, FieldError, FieldGroup } from "@/components/ui/field"

const STORE_TYPE_LABEL: Record<StoreType, string> = {
  RESTAURANT: "Restaurante",
  DARK_KITCHEN: "Dark kitchen",
  CAFE: "Café",
  BAR: "Bar",
  PIZZERIA: "Pizzaria",
  BURGER_SHOP: "Hamburgueria",
  FRANCHISE_UNIT: "Unidade de franquia",
}

const signupSchema = z.object({
  storeName: z.string().min(2, "Mínimo de 2 caracteres"),
  ownerName: z.string().min(2, "Mínimo de 2 caracteres"),
  email: z.string().min(1, "Informe o e-mail").email("E-mail inválido"),
  password: z.string().min(8, "Mínimo de 8 caracteres"),
  phone: z.string().min(8, "Telefone inválido"),
  storeType: z.enum(["RESTAURANT", "DARK_KITCHEN", "CAFE", "BAR", "PIZZERIA", "BURGER_SHOP", "FRANCHISE_UNIT"]),
})

type SignupValues = z.infer<typeof signupSchema>

export default function SignupPage() {
  const signup = useSignup()
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { storeName: "", ownerName: "", email: "", password: "", phone: "", storeType: "RESTAURANT" },
  })

  const onSubmit = handleSubmit((values) => {
    signup.mutate(values, {
      onError: (error) => {
        const message = isApiError(error)
          ? error.code === "EMAIL_ALREADY_REGISTERED"
            ? "Este e-mail já está cadastrado."
            : error.message
          : "Não foi possível criar a conta. Tente novamente."
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
          <h1 className="text-xl font-semibold tracking-tight">MarginFlow</h1>
          <p className="text-sm text-muted-foreground">Crie a conta da sua loja em poucos minutos</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Criar conta</CardTitle>
            <CardDescription>Comece a operar sua loja hoje mesmo</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} noValidate>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="storeName">Nome da loja</FieldLabel>
                  <Input id="storeName" placeholder="Pizza do João" aria-invalid={!!errors.storeName} {...register("storeName")} />
                  <FieldError errors={[errors.storeName]} />
                </Field>

                <Field>
                  <FieldLabel htmlFor="storeType">Tipo de negócio</FieldLabel>
                  <Controller
                    control={control}
                    name="storeType"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                        <SelectTrigger id="storeType" className="w-full">
                          <SelectValue>{(v: string | null) => (v ? STORE_TYPE_LABEL[v as StoreType] : "")}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(STORE_TYPE_LABEL).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="ownerName">Seu nome</FieldLabel>
                  <Input id="ownerName" autoComplete="name" aria-invalid={!!errors.ownerName} {...register("ownerName")} />
                  <FieldError errors={[errors.ownerName]} />
                </Field>

                <Field>
                  <FieldLabel htmlFor="email">E-mail</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="voce@restaurante.com"
                    aria-invalid={!!errors.email}
                    {...register("email")}
                  />
                  <FieldError errors={[errors.email]} />
                </Field>

                <Field>
                  <FieldLabel htmlFor="phone">Telefone</FieldLabel>
                  <Input id="phone" autoComplete="tel" placeholder="+55 11 99999-0000" aria-invalid={!!errors.phone} {...register("phone")} />
                  <FieldError errors={[errors.phone]} />
                </Field>

                <Field>
                  <FieldLabel htmlFor="password">Senha</FieldLabel>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Mínimo de 8 caracteres"
                    aria-invalid={!!errors.password}
                    {...register("password")}
                  />
                  <FieldError errors={[errors.password]} />
                </Field>
              </FieldGroup>

              <Button type="submit" className="mt-4 w-full" disabled={signup.isPending}>
                {signup.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                Criar conta
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Já tem uma conta?{" "}
          <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
