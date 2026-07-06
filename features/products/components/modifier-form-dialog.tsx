"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Field, FieldLabel, FieldError, FieldGroup, FieldDescription } from "@/components/ui/field"
import { useCreateModifier, useUpdateModifier } from "@/features/products/hooks"
import type { Modifier } from "@/features/products/types"

const modifierSchema = z.object({
  name: z.string().min(1, "Informe o nome").max(120),
  priceAdjustment: z.number(),
})

type ModifierFormValues = z.infer<typeof modifierSchema>

export function ModifierFormDialog({
  open,
  onOpenChange,
  productId,
  groupId,
  modifier,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  productId: string
  groupId: string
  modifier?: Modifier | null
}) {
  const isEdit = Boolean(modifier)
  const create = useCreateModifier(productId)
  const update = useUpdateModifier(productId)
  const isPending = create.isPending || update.isPending

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ModifierFormValues>({
    resolver: zodResolver(modifierSchema),
    defaultValues: { name: "", priceAdjustment: 0 },
  })

  React.useEffect(() => {
    if (open) {
      reset({ name: modifier?.name ?? "", priceAdjustment: modifier ? modifier.priceAdjustment / 100 : 0 })
    }
  }, [open, modifier, reset])

  const onSubmit = handleSubmit((values) => {
    const input = { name: values.name, priceAdjustment: Math.round(values.priceAdjustment * 100) }
    if (isEdit && modifier) {
      update.mutate({ groupId, modifierId: modifier.id, input }, { onSuccess: () => onOpenChange(false) })
    } else {
      create.mutate({ groupId, input }, { onSuccess: () => onOpenChange(false) })
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar modificador" : "Novo modificador"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="modifier-name">Nome</FieldLabel>
              <Input id="modifier-name" placeholder="Ex: Grande, Bacon extra" aria-invalid={!!errors.name} {...register("name")} />
              <FieldError errors={[errors.name]} />
            </Field>
            <Field>
              <FieldLabel htmlFor="modifier-price">Ajuste de preço (R$)</FieldLabel>
              <Input id="modifier-price" type="number" step="0.01" {...register("priceAdjustment", { valueAsNumber: true })} />
              <FieldDescription>Use valores negativos para descontos.</FieldDescription>
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {isEdit ? "Salvar" : "Criar modificador"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
