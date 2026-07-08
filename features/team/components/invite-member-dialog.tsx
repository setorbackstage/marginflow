"use client"

import * as React from "react"
import { useForm, Controller, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Field, FieldLabel, FieldError, FieldGroup, FieldDescription } from "@/components/ui/field"
import { useInviteMember } from "@/features/team/hooks"
import { ROLE_PROFILE_DESCRIPTION } from "@/features/team/status"
import type { Role } from "@/features/stores/types"

const inviteSchema = z.object({
  name: z.string().min(2, "Mínimo de 2 caracteres").max(120),
  email: z.string().email("E-mail inválido"),
  roleId: z.string().min(1, "Selecione um perfil"),
})

type InviteFormValues = z.infer<typeof inviteSchema>

export function InviteMemberDialog({
  open,
  onOpenChange,
  roles,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Assignable roles only — OWNER is excluded (cannot be granted via invitation). */
  roles: Role[]
}) {
  const invite = useInviteMember()
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { name: "", email: "", roleId: "" },
  })

  React.useEffect(() => {
    if (open) reset({ name: "", email: "", roleId: "" })
  }, [open, reset])

  const selectedRoleId = useWatch({ control, name: "roleId" })
  const selectedRole = roles.find((r) => r.id === selectedRoleId)

  const onSubmit = handleSubmit((values) => {
    invite.mutate(values, { onSuccess: () => onOpenChange(false) })
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Convidar membro da equipe</DialogTitle>
          <DialogDescription>Escolha um perfil — as permissões já vêm configuradas para a função.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="invite-name">Nome</FieldLabel>
              <Input id="invite-name" aria-invalid={!!errors.name} {...register("name")} />
              <FieldError errors={[errors.name]} />
            </Field>
            <Field>
              <FieldLabel htmlFor="invite-email">E-mail</FieldLabel>
              <Input id="invite-email" type="email" aria-invalid={!!errors.email} {...register("email")} />
              <FieldError errors={[errors.email]} />
            </Field>
            <Field>
              <FieldLabel htmlFor="invite-role">Perfil</FieldLabel>
              <Controller
                control={control}
                name="roleId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="invite-role" className="w-full">
                      <SelectValue placeholder="Selecione um perfil" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError errors={[errors.roleId]} />
              {selectedRole ? <FieldDescription>{ROLE_PROFILE_DESCRIPTION[selectedRole.name]}</FieldDescription> : null}
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={invite.isPending}>
              {invite.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Enviar convite
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
