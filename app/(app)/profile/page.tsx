"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"
import { useAuth, useUpdateProfile, useChangePassword } from "@/features/auth"
import { PageHeader } from "@/components/app-shell/page-container"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PhoneInput } from "@/components/shared"
import { useSyncedState } from "@/hooks"

function PersonalInfoSection() {
  const { session } = useAuth()
  const updateProfile = useUpdateProfile()
  const user = session.user

  const initial = React.useMemo(
    () => ({ name: user.name ?? "", phone: user.phone ?? "" }),
    [user.name, user.phone],
  )
  const [form, setForm] = useSyncedState(initial)
  const setField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const isDirty = form.name !== initial.name || form.phone !== initial.phone
  const canSave = isDirty && form.name.trim().length >= 2

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Informações pessoais</CardTitle>
        <CardDescription>Seu nome e telefone de contato.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="profile-name" className="mb-1.5">Nome</Label>
            <Input
              id="profile-name"
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="Seu nome completo"
            />
          </div>
          <div>
            <Label htmlFor="profile-email" className="mb-1.5">E-mail</Label>
            <Input
              id="profile-email"
              value={user.email}
              disabled
              className="bg-muted/50"
            />
          </div>
          <div>
            <Label htmlFor="profile-phone" className="mb-1.5">Telefone</Label>
            <PhoneInput
              id="profile-phone"
              value={form.phone}
              onChange={(value) => setField("phone", value)}
            />
          </div>
        </div>
        <Button
          size="sm"
          disabled={!canSave || updateProfile.isPending}
          onClick={() =>
            updateProfile.mutate({
              name: form.name.trim(),
              phone: form.phone || null,
            })
          }
        >
          {updateProfile.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Salvar
        </Button>
      </CardContent>
    </Card>
  )
}

function ChangePasswordSection() {
  const changePassword = useChangePassword()
  const [currentPassword, setCurrentPassword] = React.useState("")
  const [newPassword, setNewPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")

  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword
  const canSubmit =
    currentPassword.length > 0 && newPassword.length >= 8 && !mismatch

  const handleSubmit = () => {
    changePassword.mutate(
      { currentPassword, newPassword, confirmPassword },
      {
        onSuccess: () => {
          setCurrentPassword("")
          setNewPassword("")
          setConfirmPassword("")
        },
      },
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Alterar senha</CardTitle>
        <CardDescription>Escolha uma senha com pelo menos 8 caracteres.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="current-password" className="mb-1.5">Senha atual</Label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="new-password" className="mb-1.5">Nova senha</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="confirm-password" className="mb-1.5">Confirmar nova senha</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            {mismatch ? (
              <p className="mt-1 text-xs text-destructive">As senhas não coincidem.</p>
            ) : null}
          </div>
        </div>
        <Button
          size="sm"
          disabled={!canSubmit || changePassword.isPending}
          onClick={handleSubmit}
        >
          {changePassword.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Alterar senha
        </Button>
      </CardContent>
    </Card>
  )
}

export default function ProfilePage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Meu perfil"
        description="Gerencie suas informações pessoais e senha de acesso."
      />
      <PersonalInfoSection />
      <ChangePasswordSection />
    </div>
  )
}
