"use client"

import * as React from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Field, FieldLabel, FieldError, FieldGroup } from "@/components/ui/field"
import { useCreateModifierGroup, useUpdateModifierGroup } from "@/features/products/hooks"
import type { ModifierGroup } from "@/features/products/types"

const groupSchema = z
  .object({
    name: z.string().min(2, "Mínimo de 2 caracteres").max(80),
    isRequired: z.boolean(),
    minSelections: z.number().int().min(0),
    maxSelections: z.number().int().min(1),
  })
  .refine((data) => data.maxSelections >= data.minSelections, {
    path: ["maxSelections"],
    message: "Máximo deve ser maior ou igual ao mínimo",
  })

type GroupFormValues = z.infer<typeof groupSchema>

export function ModifierGroupFormDialog({
  open,
  onOpenChange,
  productId,
  group,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  productId: string
  group?: ModifierGroup | null
}) {
  const isEdit = Boolean(group)
  const create = useCreateModifierGroup(productId)
  const update = useUpdateModifierGroup(productId)
  const isPending = create.isPending || update.isPending

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<GroupFormValues>({
    resolver: zodResolver(groupSchema),
    defaultValues: { name: "", isRequired: false, minSelections: 0, maxSelections: 1 },
  })

  React.useEffect(() => {
    if (open) {
      reset({
        name: group?.name ?? "",
        isRequired: group?.isRequired ?? false,
        minSelections: group?.minSelections ?? 0,
        maxSelections: group?.maxSelections ?? 1,
      })
    }
  }, [open, group, reset])

  const onSubmit = handleSubmit((values) => {
    if (isEdit && group) {
      update.mutate({ groupId: group.id, input: values }, { onSuccess: () => onOpenChange(false) })
    } else {
      create.mutate(values, { onSuccess: () => onOpenChange(false) })
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar grupo" : "Novo grupo de modificadores"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="group-name">Nome</FieldLabel>
              <Input id="group-name" placeholder="Ex: Tamanho, Adicionais" aria-invalid={!!errors.name} {...register("name")} />
              <FieldError errors={[errors.name]} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="group-min">Mín. seleções</FieldLabel>
                <Input id="group-min" type="number" min="0" {...register("minSelections", { valueAsNumber: true })} />
                <FieldError errors={[errors.minSelections]} />
              </Field>
              <Field>
                <FieldLabel htmlFor="group-max">Máx. seleções</FieldLabel>
                <Input id="group-max" type="number" min="1" {...register("maxSelections", { valueAsNumber: true })} />
                <FieldError errors={[errors.maxSelections]} />
              </Field>
            </div>
            <Field orientation="horizontal">
              <FieldLabel htmlFor="group-required">Obrigatório</FieldLabel>
              <Controller
                control={control}
                name="isRequired"
                render={({ field }) => <Switch id="group-required" checked={field.value} onCheckedChange={field.onChange} />}
              />
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {isEdit ? "Salvar" : "Criar grupo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
