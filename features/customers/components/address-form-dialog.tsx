"use client"

import * as React from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Field, FieldLabel, FieldError, FieldGroup } from "@/components/ui/field"
import { useCreateAddress, useUpdateAddress } from "@/features/customers/hooks"
import { ADDRESS_LABEL_TEXT } from "@/features/customers/status"
import type { Address } from "@/features/customers/types"

const addressSchema = z.object({
  label: z.enum(["HOME", "WORK", "OTHER"]),
  street: z.string().min(1, "Informe a rua"),
  number: z.string().min(1, "Informe o número"),
  complement: z.string().optional(),
  neighborhood: z.string().min(1, "Informe o bairro"),
  city: z.string().min(1, "Informe a cidade"),
  state: z.string().length(2, "UF com 2 letras"),
  postalCode: z.string().min(1, "Informe o CEP"),
  isDefault: z.boolean(),
})

type AddressFormValues = z.infer<typeof addressSchema>

export function AddressFormDialog({
  open,
  onOpenChange,
  customerId,
  address,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  customerId: string
  address?: Address | null
}) {
  const isEdit = Boolean(address)
  const create = useCreateAddress(customerId)
  const update = useUpdateAddress(customerId)
  const isPending = create.isPending || update.isPending

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      label: "HOME",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      postalCode: "",
      isDefault: false,
    },
  })

  React.useEffect(() => {
    if (open) {
      reset({
        label: address?.label ?? "HOME",
        street: address?.street ?? "",
        number: address?.number ?? "",
        complement: address?.complement ?? "",
        neighborhood: address?.neighborhood ?? "",
        city: address?.city ?? "",
        state: address?.state ?? "",
        postalCode: address?.postalCode ?? "",
        isDefault: address?.isDefault ?? false,
      })
    }
  }, [open, address, reset])

  const onSubmit = handleSubmit((values) => {
    const input = { ...values, complement: values.complement || null }
    if (isEdit && address) {
      update.mutate({ addressId: address.id, input }, { onSuccess: () => onOpenChange(false) })
    } else {
      create.mutate(input, { onSuccess: () => onOpenChange(false) })
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar endereço" : "Novo endereço"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate>
          <FieldGroup>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="address-label">Tipo</FieldLabel>
                <Controller
                  control={control}
                  name="label"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} items={ADDRESS_LABEL_TEXT}>
                      <SelectTrigger id="address-label" className="w-full">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="HOME">Casa</SelectItem>
                        <SelectItem value="WORK">Trabalho</SelectItem>
                        <SelectItem value="OTHER">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
              <Field orientation="horizontal" className="items-center justify-between">
                <FieldLabel htmlFor="address-default">Padrão</FieldLabel>
                <Controller
                  control={control}
                  name="isDefault"
                  render={({ field }) => <Switch id="address-default" checked={field.value} onCheckedChange={field.onChange} />}
                />
              </Field>
            </div>
            <div className="grid grid-cols-[1fr_100px] gap-3">
              <Field>
                <FieldLabel htmlFor="address-street">Rua</FieldLabel>
                <Input id="address-street" aria-invalid={!!errors.street} {...register("street")} />
                <FieldError errors={[errors.street]} />
              </Field>
              <Field>
                <FieldLabel htmlFor="address-number">Número</FieldLabel>
                <Input id="address-number" aria-invalid={!!errors.number} {...register("number")} />
                <FieldError errors={[errors.number]} />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="address-complement">Complemento (opcional)</FieldLabel>
              <Input id="address-complement" {...register("complement")} />
            </Field>
            <Field>
              <FieldLabel htmlFor="address-neighborhood">Bairro</FieldLabel>
              <Input id="address-neighborhood" aria-invalid={!!errors.neighborhood} {...register("neighborhood")} />
              <FieldError errors={[errors.neighborhood]} />
            </Field>
            <div className="grid grid-cols-[1fr_80px_120px] gap-3">
              <Field>
                <FieldLabel htmlFor="address-city">Cidade</FieldLabel>
                <Input id="address-city" aria-invalid={!!errors.city} {...register("city")} />
                <FieldError errors={[errors.city]} />
              </Field>
              <Field>
                <FieldLabel htmlFor="address-state">UF</FieldLabel>
                <Input id="address-state" maxLength={2} aria-invalid={!!errors.state} {...register("state")} />
                <FieldError errors={[errors.state]} />
              </Field>
              <Field>
                <FieldLabel htmlFor="address-postal">CEP</FieldLabel>
                <Input id="address-postal" aria-invalid={!!errors.postalCode} {...register("postalCode")} />
                <FieldError errors={[errors.postalCode]} />
              </Field>
            </div>
          </FieldGroup>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {isEdit ? "Salvar" : "Adicionar endereço"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
