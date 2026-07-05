"use client"

import * as React from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Field, FieldLabel, FieldError, FieldGroup } from "@/components/ui/field"
import { useCreateMenu } from "@/features/menus/hooks"
import { MENU_CHANNEL_LABEL } from "@/features/menus/status"

const schema = z.object({
  name: z.string().min(1, "Informe o nome"),
  description: z.string().optional(),
  channel: z.enum(["DELIVERY", "IN_STORE", "MARKETPLACE", "KIOSK"]),
})

type FormValues = z.infer<typeof schema>

export function MenuFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const create = useCreateMenu()
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "", channel: "DELIVERY" },
  })

  const onSubmit = handleSubmit((values) => {
    create.mutate(
      { name: values.name, description: values.description || null, channel: values.channel },
      { onSuccess: () => onOpenChange(false) },
    )
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo cardápio</DialogTitle>
          <DialogDescription>Cardápios agrupam categorias por canal de venda.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="menu-name">Nome</FieldLabel>
              <Input id="menu-name" aria-invalid={!!errors.name} {...register("name")} />
              <FieldError errors={[errors.name]} />
            </Field>
            <Field>
              <FieldLabel htmlFor="menu-channel">Canal</FieldLabel>
              <Controller
                control={control}
                name="channel"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="menu-channel" className="w-full">
                      <SelectValue>{(v: string | null) => (v ? MENU_CHANNEL_LABEL[v] : "")}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(MENU_CHANNEL_LABEL).map(([value, label]) => (
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
              <FieldLabel htmlFor="menu-description">Descrição (opcional)</FieldLabel>
              <Textarea id="menu-description" rows={2} {...register("description")} />
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-4">
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Criar cardápio
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
