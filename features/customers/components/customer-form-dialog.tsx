"use client"

import * as React from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { PhoneInput, CpfCnpjInput, validateCpfOrCnpj } from "@/components/shared"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Field, FieldLabel, FieldError, FieldGroup, FieldDescription } from "@/components/ui/field"
import { useCreateCustomer, useUpdateCustomer } from "@/features/customers/hooks"
import type { CustomerDetail } from "@/features/customers/types"

const customerSchema = z.object({
  name: z.string().min(2, "Mínimo de 2 caracteres").max(120),
  phone: z.string().min(8, "Telefone inválido").max(20),
  email: z.union([z.email("E-mail inválido"), z.literal("")]).optional(),
  taxId: z.string().refine((v) => v === "" || validateCpfOrCnpj(v), { message: "CPF ou CNPJ inválido" }).optional(),
  notes: z.string().max(500).optional(),
})

type CustomerFormValues = z.infer<typeof customerSchema>

export function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer?: CustomerDetail | null
}) {
  const isEdit = Boolean(customer)
  const create = useCreateCustomer()
  const update = useUpdateCustomer()
  const isPending = create.isPending || update.isPending

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: { name: "", phone: "", email: "", taxId: "", notes: "" },
  })

  React.useEffect(() => {
    if (open) {
      reset({
        name: customer?.name ?? "",
        phone: customer?.phone ?? "",
        email: customer?.email ?? "",
        taxId: customer?.taxId ?? "",
        notes: customer?.notes ?? "",
      })
    }
  }, [open, customer, reset])

  const onSubmit = handleSubmit((values) => {
    const input = {
      name: values.name,
      phone: values.phone,
      email: values.email || null,
      taxId: values.taxId || null,
      notes: values.notes || null,
    }
    if (isEdit && customer) {
      update.mutate({ customerId: customer.id, input }, { onSuccess: () => onOpenChange(false) })
    } else {
      create.mutate(input, { onSuccess: () => onOpenChange(false) })
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar cliente" : "Novo cliente"}</DialogTitle>
          <DialogDescription>{isEdit ? "Atualize os dados do cliente." : "Cadastre um novo cliente da loja."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="customer-name">Nome</FieldLabel>
              <Input id="customer-name" aria-invalid={!!errors.name} {...register("name")} />
              <FieldError errors={[errors.name]} />
            </Field>
            <Field>
              <FieldLabel htmlFor="customer-phone">Telefone</FieldLabel>
              <Controller
                control={control}
                name="phone"
                render={({ field }) => (
                  <PhoneInput id="customer-phone" aria-invalid={!!errors.phone} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />
                )}
              />
              <FieldError errors={[errors.phone]} />
            </Field>
            <Field>
              <FieldLabel htmlFor="customer-email">E-mail (opcional)</FieldLabel>
              <Input id="customer-email" type="email" aria-invalid={!!errors.email} {...register("email")} />
              <FieldError errors={[errors.email]} />
            </Field>
            <Field>
              <FieldLabel htmlFor="customer-taxid">CPF / CNPJ (opcional)</FieldLabel>
              <Controller
                name="taxId"
                control={control}
                render={({ field }) => (
                  <CpfCnpjInput
                    id="customer-taxid"
                    aria-invalid={!!errors.taxId}
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                  />
                )}
              />
              <FieldError errors={[errors.taxId]} />
            </Field>
            <Field>
              <FieldLabel htmlFor="customer-notes">Observações</FieldLabel>
              <Textarea id="customer-notes" rows={3} {...register("notes")} />
              <FieldDescription>Notas internas, visíveis apenas para a equipe.</FieldDescription>
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {isEdit ? "Salvar" : "Criar cliente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
