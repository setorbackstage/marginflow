"use client"

import * as React from "react"
import { useForm, Controller, useWatch } from "react-hook-form"
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
import { useCreateMovement } from "@/features/inventory/hooks"
import { UNIT_LABEL, formatQuantity } from "@/features/inventory/status"
import type { Ingredient } from "@/features/inventory/types"

const MANUAL_TYPE_OPTIONS = [
  { value: "ENTRY", label: "Entrada (recebimento)" },
  { value: "EXIT", label: "Saída manual" },
  { value: "ADJUSTMENT", label: "Ajuste (contagem)" },
  { value: "LOSS", label: "Perda (quebra/vencimento)" },
] as const

const movementSchema = z
  .object({
    ingredientId: z.string().min(1, "Selecione um insumo"),
    type: z.enum(["ENTRY", "EXIT", "ADJUSTMENT", "LOSS"]),
    quantity: z.number().gt(0, "Quantidade deve ser maior que zero"),
    direction: z.enum(["INCREASE", "DECREASE"]).optional(),
    reason: z.string().max(500).optional(),
    /** ENTRY only — R$ per base unit; converted to cents on submit. */
    costPerUnit: z.number().min(0).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.type === "ADJUSTMENT" && !value.direction) {
      ctx.addIssue({ code: "custom", path: ["direction"], message: "Informe a direção do ajuste" })
    }
    if ((value.type === "ADJUSTMENT" || value.type === "LOSS") && (!value.reason || value.reason.trim().length < 3)) {
      ctx.addIssue({ code: "custom", path: ["reason"], message: "Justificativa obrigatória (mín. 3 caracteres)" })
    }
  })

type MovementFormValues = z.infer<typeof movementSchema>

export function MovementFormDialog({
  open,
  onOpenChange,
  ingredients,
  defaultIngredientId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  ingredients: Ingredient[]
  defaultIngredientId?: string
}) {
  const create = useCreateMovement()

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<MovementFormValues>({
    resolver: zodResolver(movementSchema),
    defaultValues: { ingredientId: "", type: "ENTRY", quantity: 0, reason: "" },
  })

  React.useEffect(() => {
    if (open) {
      reset({ ingredientId: defaultIngredientId ?? "", type: "ENTRY", quantity: 0, reason: "" })
    }
  }, [open, defaultIngredientId, reset])

  const selectedType = useWatch({ control, name: "type" })
  const selectedIngredientId = useWatch({ control, name: "ingredientId" })
  const selectedIngredient = ingredients.find((ingredient) => ingredient.id === selectedIngredientId)
  const unitSuffix = selectedIngredient ? UNIT_LABEL[selectedIngredient.unit] : ""

  const onSubmit = handleSubmit((values) => {
    create.mutate(
      {
        ingredientId: values.ingredientId,
        type: values.type,
        quantity: values.quantity,
        direction: values.type === "ADJUSTMENT" ? values.direction : undefined,
        reason: values.reason?.trim() || null,
        costPerUnit:
          values.type === "ENTRY" && values.costPerUnit !== undefined && !Number.isNaN(values.costPerUnit)
            ? values.costPerUnit * 100
            : undefined,
      },
      { onSuccess: () => onOpenChange(false) },
    )
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova movimentação</DialogTitle>
          <DialogDescription>
            Registra uma entrada, saída, ajuste ou perda no estoque. Movimentações são imutáveis — correções geram um
            ajuste novo.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="movement-ingredient">Insumo</FieldLabel>
              <Controller
                control={control}
                name="ingredientId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="movement-ingredient" className="w-full">
                      <SelectValue placeholder="Selecione um insumo">
                        {(value: string | null) => {
                          const ingredient = ingredients.find((i) => i.id === value)
                          return ingredient
                            ? `${ingredient.name} — ${formatQuantity(ingredient.currentStock, ingredient.unit)}`
                            : "Selecione um insumo"
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {ingredients.map((ingredient) => (
                        <SelectItem key={ingredient.id} value={ingredient.id}>
                          {ingredient.name} — {formatQuantity(ingredient.currentStock, ingredient.unit)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError errors={[errors.ingredientId]} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="movement-type">Tipo</FieldLabel>
                <Controller
                  control={control}
                  name="type"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="movement-type" className="w-full">
                        <SelectValue>
                          {(value: string | null) => MANUAL_TYPE_OPTIONS.find((t) => t.value === value)?.label ?? ""}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {MANUAL_TYPE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="movement-quantity">Quantidade {unitSuffix ? `(${unitSuffix})` : ""}</FieldLabel>
                <Input
                  id="movement-quantity"
                  type="number"
                  step="0.001"
                  min="0"
                  aria-invalid={!!errors.quantity}
                  {...register("quantity", { valueAsNumber: true })}
                />
                <FieldError errors={[errors.quantity]} />
              </Field>
            </div>

            {selectedType === "ADJUSTMENT" ? (
              <Field>
                <FieldLabel htmlFor="movement-direction">Direção do ajuste</FieldLabel>
                <Controller
                  control={control}
                  name="direction"
                  render={({ field }) => (
                    <Select value={field.value ?? null} onValueChange={field.onChange}>
                      <SelectTrigger id="movement-direction" className="w-full">
                        <SelectValue placeholder="Aumentar ou diminuir?">
                          {(value: string | null) =>
                            value === "INCREASE" ? "Aumentar saldo" : value === "DECREASE" ? "Diminuir saldo" : "Aumentar ou diminuir?"
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INCREASE">Aumentar saldo</SelectItem>
                        <SelectItem value="DECREASE">Diminuir saldo</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError errors={[errors.direction]} />
              </Field>
            ) : null}

            {selectedType === "ENTRY" ? (
              <Field>
                <FieldLabel htmlFor="movement-cost">
                  Novo custo unitário (R$ por {unitSuffix || "unidade"}, opcional)
                </FieldLabel>
                <Input
                  id="movement-cost"
                  type="number"
                  step="0.0001"
                  min="0"
                  placeholder="Mantém o custo atual se vazio"
                  {...register("costPerUnit", {
                    setValueAs: (value) => (value === "" || value === null ? undefined : Number(value)),
                  })}
                />
              </Field>
            ) : null}

            {selectedType === "ADJUSTMENT" || selectedType === "LOSS" ? (
              <Field>
                <FieldLabel htmlFor="movement-reason">Justificativa</FieldLabel>
                <Textarea id="movement-reason" rows={2} aria-invalid={!!errors.reason} {...register("reason")} />
                <FieldError errors={[errors.reason]} />
              </Field>
            ) : null}
          </FieldGroup>
          <DialogFooter className="mt-4">
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Registrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
