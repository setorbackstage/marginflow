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
import { useCreateProduct, useUpdateProduct } from "@/features/products/hooks"
import { PRODUCT_STATUS_CONFIG } from "@/features/products/status"
import type { Category, ProductListItem } from "@/features/products/types"

const productSchema = z.object({
  categoryId: z.string().min(1, "Selecione uma categoria"),
  name: z.string().min(2, "Mínimo de 2 caracteres").max(120),
  description: z.string().max(1000).optional(),
  price: z.number().min(0, "Preço deve ser positivo"),
  sku: z.string().max(50).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "OUT_OF_STOCK"]),
})

type ProductFormValues = z.infer<typeof productSchema>

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  categories,
  defaultCategoryId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  product?: ProductListItem | null
  categories: Category[]
  defaultCategoryId?: string
}) {
  const isEdit = Boolean(product)
  const create = useCreateProduct()
  const update = useUpdateProduct()
  const isPending = create.isPending || update.isPending

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: { categoryId: "", name: "", description: "", price: 0, sku: "", status: "ACTIVE" },
  })

  React.useEffect(() => {
    if (open) {
      reset({
        categoryId: product?.categoryId ?? defaultCategoryId ?? "",
        name: product?.name ?? "",
        description: product?.description ?? "",
        price: product ? product.price / 100 : 0,
        sku: product?.sku ?? "",
        status: product?.status ?? "ACTIVE",
      })
    }
  }, [open, product, defaultCategoryId, reset])

  const onSubmit = handleSubmit((values) => {
    const input = {
      categoryId: values.categoryId,
      name: values.name,
      description: values.description || null,
      price: Math.round(values.price * 100),
      sku: values.sku || null,
      status: values.status,
    }
    if (isEdit && product) {
      update.mutate({ productId: product.id, input }, { onSuccess: () => onOpenChange(false) })
    } else {
      create.mutate(input, { onSuccess: () => onOpenChange(false) })
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar produto" : "Novo produto"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Atualize os dados do produto." : "Produtos aparecem no cardápio e podem ser vendidos."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="product-category">Categoria</FieldLabel>
              <Controller
                control={control}
                name="categoryId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="product-category" className="w-full">
                      <SelectValue placeholder="Selecione uma categoria">
                        {(value: string | null) => categories.find((c) => c.id === value)?.name ?? "Selecione uma categoria"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError errors={[errors.categoryId]} />
            </Field>

            <Field>
              <FieldLabel htmlFor="product-name">Nome</FieldLabel>
              <Input id="product-name" aria-invalid={!!errors.name} {...register("name")} />
              <FieldError errors={[errors.name]} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="product-price">Preço (R$)</FieldLabel>
                <Input
                  id="product-price"
                  type="number"
                  step="0.01"
                  min="0"
                  aria-invalid={!!errors.price}
                  {...register("price", { valueAsNumber: true })}
                />
                <FieldError errors={[errors.price]} />
              </Field>
              <Field>
                <FieldLabel htmlFor="product-status">Status</FieldLabel>
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="product-status" className="w-full">
                        <SelectValue>{(value: string | null) => (value ? PRODUCT_STATUS_CONFIG[value]?.label : "")}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Ativo</SelectItem>
                        <SelectItem value="INACTIVE">Inativo</SelectItem>
                        <SelectItem value="OUT_OF_STOCK">Sem estoque</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="product-sku">SKU (opcional)</FieldLabel>
              <Input id="product-sku" {...register("sku")} />
            </Field>

            <Field>
              <FieldLabel htmlFor="product-description">Descrição</FieldLabel>
              <Textarea id="product-description" rows={3} {...register("description")} />
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-4">
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {isEdit ? "Salvar" : "Criar produto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
