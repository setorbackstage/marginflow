"use client"

import * as React from "react"
import { useForm, Controller } from "react-hook-form"
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
import { Field, FieldLabel, FieldError, FieldGroup } from "@/components/ui/field"
import { useCreateIngredient, useUpdateIngredient } from "@/features/inventory/hooks"
import { INGREDIENT_STATUS_CONFIG } from "@/features/inventory/status"
import { PurchaseCalculator } from "./purchase-calculator"
import type { Ingredient } from "@/features/inventory/types"

const UNIT_OPTIONS = [
  { value: "G", label: "Gramas (g)" },
  { value: "ML", label: "Mililitros (ml)" },
  { value: "UN", label: "Unidades (un)" },
] as const

/** Sprint 3 "Categorias de Insumos" — suggestions, not a closed list. */
const CATEGORY_SUGGESTIONS = [
  "Carnes",
  "Bebidas",
  "Temperos",
  "Limpeza",
  "Descartáveis",
  "Congelados",
  "Hortifruti",
  "Massas",
  "Embalagens",
  "Outros",
]

const ingredientSchema = z.object({
  name: z.string().min(2, "Mínimo de 2 caracteres").max(120),
  unit: z.enum(["G", "ML", "UN"]),
  /** Cost is entered in R$ per base unit and converted to cents on submit. */
  costPerUnit: z.number().min(0, "Custo deve ser positivo"),
  minStock: z.number().min(0, "Deve ser positivo").nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  category: z.string().max(60).optional(),
})

type IngredientFormValues = z.infer<typeof ingredientSchema>

export function IngredientFormDialog({
  open,
  onOpenChange,
  ingredient,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  ingredient?: Ingredient | null
}) {
  const isEdit = Boolean(ingredient)
  const create = useCreateIngredient()
  const update = useUpdateIngredient()
  const isPending = create.isPending || update.isPending

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<IngredientFormValues>({
    resolver: zodResolver(ingredientSchema),
    defaultValues: { name: "", unit: "G", costPerUnit: 0, minStock: null, status: "ACTIVE", category: "" },
  })

  React.useEffect(() => {
    if (open) {
      reset({
        name: ingredient?.name ?? "",
        unit: ingredient?.unit ?? "G",
        costPerUnit: ingredient ? ingredient.costPerUnit / 100 : 0,
        minStock: ingredient?.minStock ?? null,
        status: ingredient?.status ?? "ACTIVE",
        category: ingredient?.category ?? "",
      })
    }
  }, [open, ingredient, reset])

  const selectedUnit = watch("unit")

  const onSubmit = handleSubmit((values) => {
    const base = {
      name: values.name,
      costPerUnit: values.costPerUnit * 100,
      minStock: values.minStock,
      status: values.status,
      category: values.category?.trim() || null,
    }
    if (isEdit && ingredient) {
      // `unit` is immutable (API_SPEC.md) — never sent on update.
      update.mutate({ ingredientId: ingredient.id, input: base }, { onSuccess: () => onOpenChange(false) })
    } else {
      create.mutate({ ...base, unit: values.unit }, { onSuccess: () => onOpenChange(false) })
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar insumo" : "Novo insumo"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Atualize os dados do insumo. A unidade não pode ser alterada."
              : "O estoque inicial é sempre 0 — registre uma entrada para o saldo de abertura."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="ingredient-name">Nome</FieldLabel>
              <Input id="ingredient-name" aria-invalid={!!errors.name} {...register("name")} />
              <FieldError errors={[errors.name]} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="ingredient-unit">Unidade base</FieldLabel>
                <Controller
                  control={control}
                  name="unit"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} disabled={isEdit}>
                      <SelectTrigger id="ingredient-unit" className="w-full">
                        <SelectValue>
                          {(value: string | null) => UNIT_OPTIONS.find((u) => u.value === value)?.label ?? ""}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {UNIT_OPTIONS.map((option) => (
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
                <FieldLabel htmlFor="ingredient-status">Status</FieldLabel>
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="ingredient-status" className="w-full">
                        <SelectValue>
                          {(value: string | null) => (value ? INGREDIENT_STATUS_CONFIG[value]?.label : "")}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Ativo</SelectItem>
                        <SelectItem value="INACTIVE">Inativo</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="ingredient-category">Categoria (opcional)</FieldLabel>
              <Input id="ingredient-category" placeholder="Ex: Carnes" {...register("category")} />
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {CATEGORY_SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setValue("category", suggestion, { shouldValidate: true })}
                    className="rounded-full border border-input px-2.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </Field>

            {!isEdit ? (
              <PurchaseCalculator
                baseUnit={selectedUnit}
                onApply={(result) => setValue("costPerUnit", Number(result.costPerUnit.toFixed(4)), { shouldValidate: true })}
              />
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="ingredient-cost">Custo (R$ por unidade base)</FieldLabel>
                <Input
                  id="ingredient-cost"
                  type="number"
                  step="0.0001"
                  min="0"
                  aria-invalid={!!errors.costPerUnit}
                  {...register("costPerUnit", { valueAsNumber: true })}
                />
                <FieldError errors={[errors.costPerUnit]} />
              </Field>
              <Field>
                <FieldLabel htmlFor="ingredient-min-stock">Estoque mínimo (opcional)</FieldLabel>
                <Input
                  id="ingredient-min-stock"
                  type="number"
                  step="0.001"
                  min="0"
                  aria-invalid={!!errors.minStock}
                  {...register("minStock", {
                    setValueAs: (value) => (value === "" || value === null ? null : Number(value)),
                  })}
                />
                <FieldError errors={[errors.minStock]} />
              </Field>
            </div>
          </FieldGroup>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {isEdit ? "Salvar" : "Criar insumo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
