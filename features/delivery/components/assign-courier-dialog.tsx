"use client"

import * as React from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Field, FieldLabel, FieldError, FieldGroup } from "@/components/ui/field"
import { PhoneInput } from "@/components/shared"
import { useAssignCourier } from "@/features/delivery/hooks"
import type { Delivery } from "@/features/delivery/types"

const COURIER_TYPE_LABEL: Record<string, string> = { INTERNAL: "Próprio", PLATFORM: "Plataforma" }
const PLATFORM_LABEL: Record<string, string> = { IFOOD: "iFood", RAPPI: "Rappi", UBER_EATS: "Uber Eats", LOGGI: "Loggi", OTHER: "Outra" }

const schema = z.object({
  courierName: z.string().min(1, "Informe o nome"),
  courierPhone: z.string().optional(),
  courierType: z.enum(["INTERNAL", "PLATFORM"]),
  platform: z.enum(["IFOOD", "RAPPI", "UBER_EATS", "LOGGI", "OTHER"]).optional(),
})

type FormValues = z.infer<typeof schema>

export function AssignCourierDialog({ open, onOpenChange, delivery }: { open: boolean; onOpenChange: (open: boolean) => void; delivery: Delivery }) {
  const assignCourier = useAssignCourier()
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      courierName: delivery.courierName ?? "",
      courierPhone: delivery.courierPhone ?? "",
      courierType: delivery.courierType ?? "INTERNAL",
      platform: delivery.platform ?? undefined,
    },
  })
  const courierType = watch("courierType")

  const onSubmit = handleSubmit((values) => {
    assignCourier.mutate(
      { deliveryId: delivery.id, input: { ...values, platform: courierType === "PLATFORM" ? values.platform : null } },
      { onSuccess: () => onOpenChange(false) },
    )
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Atribuir entregador — Pedido #{delivery.orderNumber}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="courier-type">Tipo</FieldLabel>
              <Controller
                control={control}
                name="courierType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} items={COURIER_TYPE_LABEL}>
                    <SelectTrigger id="courier-type" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INTERNAL">Próprio</SelectItem>
                      <SelectItem value="PLATFORM">Plataforma</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            {courierType === "PLATFORM" ? (
              <Field>
                <FieldLabel htmlFor="platform">Plataforma</FieldLabel>
                <Controller
                  control={control}
                  name="platform"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} items={PLATFORM_LABEL}>
                      <SelectTrigger id="platform" className="w-full">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(PLATFORM_LABEL).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            ) : null}
            <Field>
              <FieldLabel htmlFor="courier-name">Nome do entregador</FieldLabel>
              <Input id="courier-name" aria-invalid={!!errors.courierName} {...register("courierName")} />
              <FieldError errors={[errors.courierName]} />
            </Field>
            <Field>
              <FieldLabel htmlFor="courier-phone">Telefone (opcional)</FieldLabel>
              <Controller
                control={control}
                name="courierPhone"
                render={({ field }) => (
                  <PhoneInput id="courier-phone" value={field.value ?? ""} onChange={field.onChange} onBlur={field.onBlur} />
                )}
              />
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={assignCourier.isPending}>
              {assignCourier.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
